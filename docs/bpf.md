---
title: fbac.dev
description: /home/fbac/docs/bpf
layout: default.liquid
data:
  route: docs
---
# bpf/ebpf

### bpftrace

- docs

<https://github.com/iovisor/bpftrace>
<https://github.com/iovisor/bpftrace/blob/master/docs/reference_guide.md>
<http://www.brendangregg.com/BPF/bpftrace-cheat-sheet.html>
<http://www.brendangregg.com/bpf-performance-tools-book.html>

- articles
  
<https://lwn.net/Articles/793749/>
<https://fedoramagazine.org/trace-code-in-fedora-with-bpftrace/>

- **Probe points**

```text
kprobe – kernel function start
kretprobe – kernel function return
uprobe – user-level function start
uretprobe – user-level function return
tracepoint – kernel static tracepoints
usdt – user-level static tracepoints
profile – timed sampling
interval – timed output
software – kernel software events
hardware – processor-level events
```

- **List kprobe/kretprobe, tracepoints, software and hardware probes**

```bash
bpftrace -l
```

- **List available fields in a tracepoint**

```bash
bpftrace -lv "t:syscalls:sys_enter_execve"
```

- The **uprobe/uretprobe** and usdt probes are userspace probes specific to a given executable.

List probes for an executable

```bash
bpftrace -l "uprobe:/bin/bash"
```

Example to show the return values of readline

```bash
bpftrace -e 'uretprobe:/bin/bash:readline { printf("readline: \"%s\"\n", str(retval)); }'
```

A str() call is necessary to turn the char * pointer to a string.

- The **profile and interval probes** fire at fixed time intervals.

- **Example**: show the parent process (comm) and processes executed by it

```bash
bpftrace -e 't:syscalls:sys_enter_execve { printf("%s called %s\n", comm, str(args->filename)); }'
```

- **Count system calls** using maps

Some probes allow wildcards.

In this example, the action block attaches to all tracepoints whose name starts with t:syscalls:sys_enter_, which means all available syscalls.

The bpftrace builtin function count() counts the number of times this function is called. **@[] represents a map** (an associative array). The key of this map is **probe, which is another bpftrace builtin that represents the full probe name.**

```bash
bpftrace -e 't:syscalls:sys_enter_* { @[probe] = count(); }'
bpftrace -e 't:syscalls:sys_enter_* / pid == 1234 / { @[probe] = count(); }'
```

#### examples

- Write bytes by process

```bash
bpftrace -e 't:syscalls:sys_exit_write /args->ret > 0/ { @[comm] = sum(args->ret); }'
```

it uses a filter to discard the negative values, which are error codes (/args->ret > 0/)
comm represents the process name that called the syscall.
sum() builtin function accumulates the number of bytes written for each map entry or process.
the write syscall returns the number of written bytes. args->ret provides access to the bytes.

- Read size distribution by process (histogram)
  
```bash
bpftrace -e 't:syscalls:sys_exit_read { @[comm] = hist(args->ret); }'
```

Histograms are BPF maps, so they must always be attributed to a map (@). In this example, the map key is comm.
To generate just one global histogram, attribute the hist() function just to ‘@’ (without any key).

- watch tcp_sendmsg size for ten seconds, and watch tcp_sendmsg errors

`net/ipv4/tcp.c`: int tcp_sendmsg(struct sock *sk, struct msghdr *msg, size_t size);

This is using a kprobe ("k") on tcp_sendmsg(), and saving a histogram of arg2 (size)

```bash
bpftrace -e 'k:tcp_sendmsg { @size = hist(arg2); } interval:s:10 { exit(); }'
```

Using a kretprobe ("kr"), and I'm frequency counting retval, which is either a negative error code or the size. It don't care about the size, so use a ternary operator to set all positive values to zero.

```bash
bpftrace -e 'kr:tcp_sendmsg { @retvals[retval > 0 ? 0 : retval] = count(); }
        interval:s:10 { exit(); }'
```

#### shipped scripts in bpftrace

```bash
    killsnoop.bt – Trace signals issued by the kill() syscall.
    tcpconnect.bt – Trace all TCP network connections.
    pidpersec.bt – Count new procesess (via fork) per second.
    opensnoop.bt – Trace open() syscalls.
    vfsstat.bt – Count some VFS calls, with per-second summaries.
```
