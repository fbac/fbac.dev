---
title: "How to write eBPF programs with Golang"
date: 2022-09-22
description: "Making sense of eBPF, BTF, bpf2go and Golang."
draft: false
---

I'm extremely curious when it comes to Linux kernel development and all the tools in the ecosystem.

While eBPF is not exactly new (7 years old, at this moment), it's still early in terms of Linux kernel, where adoption of new technologies occurrs usually in a slow pace. And I've been eager for a while to start diving into it.

Recently, I had some time to dedicate to **eBPF** and **BTF**, so I just started reading the docs at [kernel.org](https://www.kernel.org/doc/html/latest/bpf/instruction-set.html) (really recommended!), and because **doing** is the best way of learning, I just simply wrote a library, **sklookup-go**, in Golang around **sk_lookup**, that would help me with some legacy TCP servers.

### The library, what is sklookup-go?

[**sklookup-go**](https://github.com/fbac/sklookup-go) is a project that provides:

- A **cli** to run against a program that's binded into one socket, providing this program (specified by its PID) of some additional ports. (Max. 1024)
- It's also a **package** that you can use from your Golang code. Maybe you have some program that binds into a port, and for some reason you don't want to bind it anywhere else. That's not a problem, import the library, pass the listener's file descriptor and some additional ports and you're ready to roll.
- This two capabilities rely on a **sk_lookup** eBPF program, compiled through [**bpf2go**](https://github.com/cilium/ebpf/tree/master/cmd/bpf2go) and the logic written thanks to the Golang package [**cilium/ebpf**](https://github.com/cilium/ebpf).

### And what exactly is sk_lookup?

There are many eBPF program types, and [sk_lookup](https://www.kernel.org/doc/html/latest/bpf/prog_sk_lookup.html) (**BPF_PROG_TYPE_SK_LOOKUP**) is just one of them.

This type of program runs in the kernel protocol layer, just before attaching a connection to an existing receive buffer in a socket.

Or **roughly** speaking, when the kernel is trying to make sense of where to pass this specific chunk of data that it received, sk_lookup comes into it and pass the data to a file descriptor which points to a socket.

### But… then, what is eBPF?

[eBPF](https://ebpf.io/what-is-ebpf) is undeniably a revolutionary technology. It introduces programmability in an space, the Linux kernel ([Windows](https://github.com/microsoft/ebpf-for-windows), as well), that traditionally was restricted to kernel modules.

A kernel is, for obvious reasons, the most critical piece of every OS, and its evolution is often slow, but thanks to eBPF this is no longer true. Everyone, as a system programmer, can load programs into the kernel and run them in a sandboxed fashion.

### So, why is this useful for us?

First of all, because it's extremely **cool**. Never forget the rule of cool; you know… anything is acceptable to do, so long as it is [**cool**](https://en.wiktionary.org/wiki/cool).

And also, seriously speaking, imagine the scenario where you have to provide additional ports to a legacy application which happens to listen only in one socket, or just one IP. And you **really** need it to listen in more sockets.

Or maybe you want to implement a [L7 proxy](https://simple.wikipedia.org/wiki/OSI_model#Layer_7:_Application_layer), while binding your proxy only to one IP or socket.

If you dream about it, you can do it.

### Why using the ebpf package developed by Cilium?

There are many good libraries to interact with ebpf, but I chose **cilium/ebpf** because their approach as a **pure Go implementation**. It feels completely sane and reasonable, as we no longer rely on other build tools or workflows to get the job done.

Also, while used with **bpf2go** it allows you to interact with the program without having to compile the ELF binaries by yourself, and that's one thing less to worry about.

> Remember, **bpf2go** will compile the source code into eBPF bytecode, in a similar fashion as the cli **bpftool gen skeleton**.

### Into some technical details in C and eBPF

eBPF programs are written in C, so far we're not free of writing the program as well. You can check the **eBPF C program** [**here**](https://github.com/fbac/sklookup-go/tree/main/pkg/ebpf/src). That's the sk_lookup program which acts as the backend of **sklookup-go**.

The implementation is based on [this](https://github.com/jsitnicki/ebpf-summit-2020/blob/master/echo_dispatch.bpf.c) [Jakub Sitnicki](https://github.com/jsitnicki) code, though I changed the maps to support BTF (we'll talk about this in a following article)

Also, it's critical to mention that the user interacts with eBPF programs through [**eBPF Maps**](https://www.kernel.org/doc/html/latest/bpf/maps.html) loaded into kernel memory, that's the way an user is able to share information between userspace and the kernel, and what we'll be doing in the Go library.

The following two maps is where the magic resides:

- In the **hashMap**, up to a maximum of 1024 key:value are stored. The key is the actual port number, and we don't care about its value.
- In the **sockMap** there can be only one value at key 0; the destination socket's file descriptor.

```c
/* List of additional service ports. Key is the port number. */
struct {
	__uint(type, BPF_MAP_TYPE_HASH);
	__type(key, __u16);
	__type(value, __u8);
	__uint(max_entries, 1024);
} add_ports SEC(".maps");

/* Target socket */
struct {
	__uint(type, BPF_MAP_TYPE_SOCKMAP);
	__type(key, __u32);
	__type(value, __u64);
	__uint(max_entries, 1);
} target_socket SEC(".maps");
```

### And, finally, the Go pumbling

By now you'll have noticed that I don't explicitly compile the C code into an ELF binary, though it's needed for us to run eBPF programs.

So take a look at **ebpf.go**, specifically at this little bit:

```go
//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -cc $BPF_CLANG -cflags $BPF_CFLAGS bpf src/ebpf/sk_dispatch.c -- -Isrc/headers
```

This line calls **bpf2go**, and generates the needed ELF's and two go files, **bpf_bpfeb.go** and **bpf_bpfel.go**, for Big and Little Endian respectively, with all the functions you'll need to call from your Go code.

The code at ebpf.go is where the main magic resides, and it handles a fair bunch of stuff:

- It loads the BPF objects (maps and program) that needs to be loaded into kernel's memory.
- It **Pin()** these objects into the system.

> Pin() is the method used to create a file where the eBPF Map will be accessed. It requires a BPF filesystem, usually /sys/fs/bpf.

- Also, **don't forget** to **Unpin()** and **Close()** the maps and the program after using them, otherwise that would leave the maps and program mounted into the fs.
- It creates the [**dispatcher link**](https://github.com/fbac/sklookup-go/blob/main/pkg/ebpf/ebpf.go#L269), and clones the caller network namespace, so the communication between processes can happen.

```go
func getDispatcherLink(p *ebpf.Program) (*link.NetNsLink, error) {
	// Get self net-namespace
	netns, err := os.Open("/proc/self/ns/net")
	if err != nil {
		return nil, err
	}
	defer netns.Close()

	// Attach the network namespace to the link
	lnk, err := link.AttachNetNs(int(netns.Fd()), p)
	if err != nil {
		return nil, err
	}

	return lnk, nil
}
```

- When attaching [**to an external process**](https://github.com/fbac/sklookup-go/blob/main/pkg/ebpf/ebpf.go#L237), the program also performs a systemcall of **pidfd_getfd(pidfd_open(PID, o), FD, 0)**, to duplicate the target socket's file descriptor, so it can be used by our calling program. It looks like the following:

```go
func (e *EbpfExternalDispatcher) getListenerFd() uintptr {
	// pidfd_open
	pidFd, err := pidfd.Open(e.TargetPID, 0)
	if err != nil {
		e.Log.Panic().Err(err).Msgf("Unable to open target pid %v", e.TargetPID)
	}
	e.Log.Trace().Msgf("getListenerFd.pidFd: %v", pidFd)

	// pidfd_getfd
	listenFd, err := pidFd.GetFd(int(pidFd), 0)
	if err != nil {
		e.Log.Panic().Err(err).Msgf("Unable to duplicate target fd %v", pidFd)
	}
	e.Log.Trace().Msgf("getListenerFd.listenFd: %v", listenFd)

	file := os.NewFile(uintptr(listenFd), "")

	return file.Fd()
}
```

- Finally it handles the addition of the target socket's file descriptor, add the origin ports to be used, and some boilerplate code.

### Wrapping up

This library is under heavy development, it's now at **v0.1.0-alpha** version, as it's the first iteration I've rolled out.

I had a blast writing this, and already wrote a TCP proxy relying on it (which works!). So, if you're curious about eBPF and Go, please be more than welcome to use the package, modify, contribute.

As a conclusion, I'm extremely hyped by the eBPF technology and the use cases that we'll see in the future. Usually the kernel development moves slowly, and also is the process of creating kernel modules and pushing them to stable and broadly adopted by the community.

With this technology I'm sure we'll see amazing projects doing some cool things, starting from SDN, to Security and many other use cases.

**Keep curious!**
