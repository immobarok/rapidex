package engine

import "rappidex/internal/models"

const (
	MinInitialChunk int64 = 256 * 1024 // don't open a connection for less than this at start
	MinSplitBytes   int64 = 512 * 1024 // a part must have at least 2x this left to be split
)

// SplitInitial divides a file into equal starting parts (one per connection).
func SplitInitial(totalSize int64, numConns int) []models.ChunkState {
	if totalSize <= 0 {
		return []models.ChunkState{{ID: 0, StartByte: 0, CurrentPos: 0, EndByte: -1}}
	}
	if numConns < 1 {
		numConns = 1
	}
	if byMin := int(totalSize / MinInitialChunk); byMin < numConns {
		numConns = max(1, byMin)
	}

	chunkSize := totalSize / int64(numConns)
	chunks := make([]models.ChunkState, 0, numConns)
	for i := 0; i < numConns; i++ {
		start := int64(i) * chunkSize
		end := start + chunkSize - 1
		if i == numConns-1 {
			end = totalSize - 1
		}
		chunks = append(chunks, models.ChunkState{ID: i, StartByte: start, CurrentPos: start, EndByte: end})
	}
	return chunks
}

// StealWork implements IDM-style dynamic segmentation: when a connection becomes free,
// the part with the most bytes left is split in half and the free connection takes the second half.
func StealWork(chunks []models.ChunkState, nextID int) *models.ChunkState {
	largestIdx := -1
	var maxRemaining int64

	for i := range chunks {
		c := chunks[i]
		if !c.Active || c.EndByte < 0 || c.Done() {
			continue
		}
		rem := c.EndByte - c.CurrentPos + 1
		if rem > maxRemaining {
			maxRemaining = rem
			largestIdx = i
		}
	}

	if largestIdx == -1 || maxRemaining < MinSplitBytes*2 {
		return nil
	}

	target := &chunks[largestIdx]
	mid := target.CurrentPos + maxRemaining/2
	newChunk := models.ChunkState{
		ID:         nextID,
		StartByte:  mid + 1,
		CurrentPos: mid + 1,
		EndByte:    target.EndByte,
	}
	target.EndByte = mid
	return &newChunk
}
