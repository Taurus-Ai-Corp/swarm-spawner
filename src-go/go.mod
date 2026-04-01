module github.com/taurus-ai/swarm-spawner

go 1.21

require (
	github.com/hashgraph/hedera-sdk-go v0.0.0
	github.com/noblepostquantum/mlkem v0.0.0
)

replace github.com/hashgraph/hedera-sdk-go => ./hedera-sdk-stub
replace github.com/noblepostquantum/mlkem => ./pqc-stub