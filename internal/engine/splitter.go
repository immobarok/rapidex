package engine

import "rappidex/internal/models"

const MinSplitBytes int64 = 512 * 1024 // 512 KB minimum chunk size for dynamic splitting

// SplitInitial divides a file of totalSize into numConns initial byte ranges.
func SplitInitial(totalSize int64, numConns int) []models.ChunkState {
	if totalSize <= 0 || numConns <= 1 {
		return []models.ChunkState{{
			ID:         0,
			StartByte:  0,
			CurrentPos: 0,
			EndByte:    totalSize - 1,
			Active:     true,
		}}
	}

	chunkSize := totalSize / int64(numConns)
	chunks := make([]models.ChunkState, 0, numConns)
	for i := 0; i < numConns; i++ {
		start := int64(i) * chunkSize
		end := start + chunkSize - 1
		if i == numConns-1 {
			end = totalSize - 1
		}
		chunks = append(chunks, models.ChunkState{
			ID:         i,
			StartByte:  start,
			CurrentPos: start,
			EndByte:    end,
			Active:     true,
		})
	}
	return chunks
}

// StealWork finds the active chunk with the largest remaining bytes and splits it in half
// (IDM's signature dynamic in-flight segmentation).
func StealWork(chunks []models.ChunkState, nextID int) *models.ChunkState {
	largestIdx := -1
	var maxRemaining int64

	for i := range chunks {
		rem := chunks[i].EndByte - chunks[i].CurrentPos
		if chunks[i].Active && rem > maxRemaining {
			maxRemaining = rem
			largestIdx = i
		}
	}

	if largestIdx == -1 || maxRemaining < MinSplitBytes*2 {
		return nil
	}

	target := &chunks[largestIdx]
	mid := target.CurrentPos + (maxRemaining / 2)
	newChunk := models.ChunkState{
		ID:         nextID,
		StartByte:  mid + 1,
		CurrentPos: mid + 1,
		EndByte:    target.EndByte,
		Active:     true,
	}
	target.EndByte = mid
	return &newChunk
}

