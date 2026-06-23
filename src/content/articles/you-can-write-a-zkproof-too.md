---
title: "You can write a ZKProof too!"
date: 2024-02-01
description: "Zero-knowledge proofs demystified with a practical implementation."
draft: false
---

I love maths I'm bad at… it's kind of a long-lasting toxic relationship between us. I'm deeply impressed on how they rule the universe and esentially everything you can think of. All the computer sciences are built on top of them, and sometimes I like to give them a try and understand new concepts and read some articles.

Lately a new buzzword has been resonating all over the blockchain and software engineering space, and unless you've been living in a cave you probably heard about zero-knowledge proofs.

In plain words; it's a mathematical method used by a _prover_ to prove that it actually knows _some information_, so a _verifier_ can verify with total accuracy that the statement is true. But, **here's the twist**: the prover **never** gets to share the information with the verifier.

Imagine that you can prove you paid your taxes, or the fact that you own a 1967 Chevy Impala to a 3rd party, all this without sharing any data, no receipts, no official documents, no photos, no data, nothing, nada.

You are just able to share with them _something_ that automatically verifies your statement is true. Now that's a zero knowledge proof!

So, with this in mind, I thought it would be nice to write a proof of concept in Golang, based on the Chaum-Pedersen protocol. I'm not going to discuss the internals of the protocol because there are better sources to learn about it, but it narrows down to check two logarithms are equal. Seriously, read the article, it's really nice.

After some work, I ended up with a zkproof functional test like the following.

```go
func TestZKProofSuccess(t *testing.T) {
	// We have a server, the Verifier.
	var s ZKVerifier = new(ZKServer)

	// And a Client, the prover.
	var c ZKProver = new(ZKClient)

	// The client generate a new random password to register itself.
	// This data is never stored anywhere, only the client knows it.
	var userPassword int64 = 10

	// With the password, it generates a pair Y1, Y2.
	// In a real world application, this Y1 and Y2 are passed to the server!
	Y1, Y2 := c.GenerateYPair(userPassword)

	// The server answer with a random challenge.
	// In this example is simply a random int64 in the range [0, 1000]
	challenge := s.Challenge()

	// The client generates a challenge answer using the password it knows.
	// Remember, this password is never shared and completely unknown to the
	// verifier.
	challengeAnswer := c.ChallengeAnswer(userPassword, challenge)

	// The verifier verifies, that's what they do.
	if !s.Verify(Y1, Y2, challengeAnswer, challenge) {
		t.Fail()
	}
}
```

And it worked! So magical and elegant.

After creating the library I embedded everything into a client-server architecture which communicates over gRPC, creating that way an authentication server where the user passwords are never stored anywhere.

I hope this sparked some curiosity on the reader, it's a deeply interesting topic and we have only seen the tip of the iceberg. The future will be full of ZK Proofs, of that I'm pretty sure, which will power more secure communications, blockchains and rollups, data transmissions and multiple uses cases.

Last but not least you can check the [full code here](https://github.com/fbac/zkproof-go), in case you need some inspiration for your next project.
