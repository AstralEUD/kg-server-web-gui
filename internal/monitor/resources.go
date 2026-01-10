package monitor

import (
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemStats struct {
	CPUPercent      float64 `json:"cpuPercent"`
	MemoryUsed      uint64  `json:"memoryUsed"`
	MemoryTotal     uint64  `json:"memoryTotal"`
	MemoryPercent   float64 `json:"memoryPercent"`
	DiskUsed        uint64  `json:"diskUsed"`
	DiskTotal       uint64  `json:"diskTotal"`
	DiskPercent     float64 `json:"diskPercent"`
	NetworkBytesIn  uint64  `json:"networkBytesIn"`
	NetworkBytesOut uint64  `json:"networkBytesOut"`
}

var lastNetStats []net.IOCountersStat
var lastNetTime time.Time

func GetSystemStats() (*SystemStats, error) {
	stats := &SystemStats{}

	// CPU
	cpus, err := cpu.Percent(0, false)
	if err == nil && len(cpus) > 0 {
		stats.CPUPercent = cpus[0]
	}

	// Memory
	vmem, err := mem.VirtualMemory()
	if err == nil {
		stats.MemoryUsed = vmem.Used
		stats.MemoryTotal = vmem.Total
		stats.MemoryPercent = vmem.UsedPercent
	}

	// Disk (Current directory volume)
	parts, err := disk.Partitions(false)
	if err == nil && len(parts) > 0 {
		usage, err := disk.Usage(parts[0].Mountpoint)
		if err == nil {
			stats.DiskUsed = usage.Used
			stats.DiskTotal = usage.Total
			stats.DiskPercent = usage.UsedPercent
		}
	}

	// Network I/O (Calculate rate)
	netStats, err := net.IOCounters(false)
	if err == nil && len(netStats) > 0 {
		current := netStats[0]
		now := time.Now()

		if len(lastNetStats) > 0 {
			duration := now.Sub(lastNetTime).Seconds()
			if duration > 0 {
				stats.NetworkBytesIn = uint64(float64(current.BytesRecv-lastNetStats[0].BytesRecv) / duration)
				stats.NetworkBytesOut = uint64(float64(current.BytesSent-lastNetStats[0].BytesSent) / duration)
			}
		}
		lastNetStats = netStats
		lastNetTime = now
	}

	return stats, nil
}
