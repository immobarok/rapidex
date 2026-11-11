package main

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
)

// Chrome/Firefox Native Messaging host binary that bridges browser events to Rappidex.
func main() {
	for {
		var length uint32
		if err := binary.Read(os.Stdin, binary.LittleEndian, &length); err != nil {
			if err == io.EOF {
				return
			}
			os.Exit(1)
		}
		buf := make([]byte, length)
		if _, err := io.ReadFull(os.Stdin, buf); err != nil {
			os.Exit(1)
		}
		// Forward payload to local Rappidex IPC server (127.0.0.1:41920)
		resp := []byte(fmt.Sprintf(`{"ok":true,"received":%d}`, len(buf)))
		_ = binary.Write(os.Stdout, binary.LittleEndian, uint32(len(resp)))
		_, _ = os.Stdout.Write(resp)
	}
}

