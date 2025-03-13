package main

import (
	"fmt"

	"github.com/cespare/xxhash"
	"github.com/redis/go-redis/v9"
)

func main() {
	x := xxhash.Sum64String("somerandomshit-1")
	fmt.Println(x)
	redis.NewRing(&redis.RingOptions{
		Addrs: map[string]string{
			// shardName => host:port
			"shard1": "localhost:7000",
			"shard2": "localhost:7001",
			"shard3": "localhost:7002",
		},
	})
}
