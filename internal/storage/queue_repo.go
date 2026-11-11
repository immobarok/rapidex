package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"rappidex/internal/models"
)

const MainQueueID = "main"

// QueueRepo persists download queues and their schedules.
type QueueRepo struct {
	mu       sync.Mutex
	filePath string
	queues   []models.QueueConfig
}

func defaultQueues() []models.QueueConfig {
	return []models.QueueConfig{{
		ID:            MainQueueID,
		Name:          "Main Download Queue",
		MaxConcurrent: 2,
		AfterDone:     models.AfterDoneNothing,
		Schedule:      models.QueueSchedule{StartTime: "02:00", StopTime: "08:00", Days: []int{}},
		Builtin:       true,
	}}
}

func NewQueueRepo(dataDir string) *QueueRepo {
	_ = os.MkdirAll(dataDir, 0o755)
	r := &QueueRepo{filePath: filepath.Join(dataDir, "queues.json")}
	if data, err := os.ReadFile(r.filePath); err == nil {
		_ = json.Unmarshal(data, &r.queues)
	}
	hasMain := false
	for i := range r.queues {
		r.queues[i].Running = false // queues never auto-run after a restart (only by schedule)
		normalizeQueue(&r.queues[i])
		if r.queues[i].ID == MainQueueID {
			hasMain = true
			r.queues[i].Builtin = true
		}
	}
	if !hasMain {
		r.queues = append(defaultQueues(), r.queues...)
	}
	return r
}

func normalizeQueue(q *models.QueueConfig) {
	q.Name = strings.TrimSpace(q.Name)
	if q.Name == "" {
		q.Name = "New Queue"
	}
	if q.MaxConcurrent < 1 {
		q.MaxConcurrent = 1
	}
	if q.MaxConcurrent > 16 {
		q.MaxConcurrent = 16
	}
	switch q.AfterDone {
	case models.AfterDoneExit, models.AfterDoneSleep, models.AfterDoneShutdown, models.AfterDoneNothing:
	default:
		q.AfterDone = models.AfterDoneNothing
	}
	if q.Schedule.Days == nil {
		q.Schedule.Days = []int{}
	}
}

func (r *QueueRepo) saveLocked() error {
	data, err := json.MarshalIndent(r.queues, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomic(r.filePath, data, 0o644)
}

func (r *QueueRepo) List() []models.QueueConfig {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]models.QueueConfig, len(r.queues))
	copy(out, r.queues)
	for i := range out {
		out[i].Schedule.Days = append([]int{}, r.queues[i].Schedule.Days...)
	}
	return out
}

func (r *QueueRepo) Get(id string) (models.QueueConfig, bool) {
	for _, q := range r.List() {
		if q.ID == id {
			return q, true
		}
	}
	return models.QueueConfig{}, false
}

// Save creates (empty ID) or updates a queue. The Running flag is preserved.
func (r *QueueRepo) Save(q models.QueueConfig) (models.QueueConfig, error) {
	normalizeQueue(&q)
	r.mu.Lock()
	defer r.mu.Unlock()
	if q.ID == "" {
		q.ID = fmt.Sprintf("q_%d", time.Now().UnixNano())
		q.Running = false
		q.Builtin = false
		r.queues = append(r.queues, q)
		return q, r.saveLocked()
	}
	for i := range r.queues {
		if r.queues[i].ID == q.ID {
			q.Running = r.queues[i].Running
			q.Builtin = r.queues[i].Builtin
			r.queues[i] = q
			return q, r.saveLocked()
		}
	}
	return q, fmt.Errorf("queue not found")
}

func (r *QueueRepo) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.queues {
		if r.queues[i].ID == id {
			if r.queues[i].Builtin {
				return fmt.Errorf("the main queue cannot be deleted")
			}
			r.queues = append(r.queues[:i], r.queues[i+1:]...)
			return r.saveLocked()
		}
	}
	return fmt.Errorf("queue not found")
}

func (r *QueueRepo) SetRunning(id string, running bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.queues {
		if r.queues[i].ID == id {
			r.queues[i].Running = running
			return nil
		}
	}
	return fmt.Errorf("queue not found")
}
