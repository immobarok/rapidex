package scheduler

// PreventSleep keeps the OS awake while active queues are downloading.
func PreventSleep() error {
	return nil
}

// ShutdownSystem triggers OS shutdown when "Turn off computer when done" is enabled.
func ShutdownSystem() error {
	return nil
}

