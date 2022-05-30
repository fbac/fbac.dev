---
permalink: /about
title: fbac.dev
layout: default.liquid
data:
  route: about
---

<div>

<h1>/home/fbac/about</h1>

# **`Booting system ...`**

```bash
Welcome to fbac.dev release-2.0.1!

Your id is: guest
```

  

## **`[guest@localhost /]$ su - fbac`**

</div>

<div>

<details>

  <summary></summary>

```bash
Password: **********
Authentication succeded!
```

</details>


### **`[fbac@localhost ~]$ cat about.md`** 

<details>
  <summary></summary>

<img class="me-image" src="/img/me.jpg" />

Hello, there! 👋🏻

My name is **Borja**, and I grew up surrounded by computers. The first OS I used was MS-DOS as kid, in a really old Olivetti M380 XP3 80386. I loved since the very beggining changing batch and system files, just to see _what would happen if I change this thing I don't event understand_. Those were fun times for my father.

Eventually I fell in love with operating systems and opensource development.

Nowadays, my key expertise areas are Red Hat OpenShift, Kubernetes, programming and automation & CI/CD. And I still love kernel and networking problems, as debugging complex low-level stuff is my main passion.

My current role is **Principal Software Engineer**@**Red Hat**, where I'm mainly focused in the architecture and developing of software pieces focused in OpenShift, Kubernetes, container runtimes, bugfixing and contributing in whatever project I stumble upon.

I guess I just perform some software engineer stuff.
</details>

### **`[fbac@localhost ~]$ cat skills.yaml`**

<details>
  <summary></summary>

```yaml

apiVersion: v1
kind: Person
metadata:
  name: Borja
  role: Open Source Software Engineer
skills:
  gnu/linux:
    kernel:
      skillLevel: high
      interestLevel: high
      knowledgeIn:
      - lowLevelDebugging
      - developingModules
    operating-system:
      skillLevel: high
      interestLevel: high
      knowledgeIn:
      - installing
      - configuring
      - managing
      - shellScripting
  networking:
    skillLevel: medium
    interestLevel: high
    knowledgeIn:
      tcp/ip: true
      knowledge:
      - routing
      - switching
      - netfilter
      - iptables
      debugging:
        wireshark: true
        tshark: true
  openShift-and-kubernetes:
    skillLevel: high
    interestLevel: high
    knowledgeIn:
    - installing
    - configuring
    - day2operations
    - migratingWorkloads
    - automatingWorkloads
    - CI/CD
  programmingLanguages:
    skillLevel: high
    interestLevel: high
    languages:
      current: [go, python]
      used: [c, java]
      interestedIn: rust
    debugging:
      debuggers: true
      compilers: true
  automation:
    skillLevel: medium
    interestLevel: medium
    tools:
      ansible: true
      puppet: true
  ci/cd:
    skillLevel: medium
    interestLevel: medium
    tools:
      githubActions: true
      jenkins: true
  otherSkills: 
  - "strong development workflow skills"
  - "team-player who loves interesting discussions and multiple opinions"
  - "fast and *REALLY AVID* learner"
  - "curious by nature, constantly reading and learning"
  - "self-improvement as a way of life"

```

</details>

### **`[fbac@localhost ~]$ cat hobbies.md`**

<details>

  <summary></summary>

In my free time I like to...

- Spend time with my **wife**, **son** and **family** is my **key priority**!
- **Healthy living**: gym rat, meditation, hiking and dieting with a goal in mind.
- **Board games**: wargaming, strategy, horror or dungeon crawlers... I'm just addicted to them all.
- **Video games**: currently playing **Dead Cells**.
- **Learning** and **hacking**: I just can't stop and whenever I have some free time I continue my learning process. Currently learning **Rust**.

</details>

### **`[fbac@localhost ~]$ logout`**

<details>
  <summary></summary>

```bash
Goodbye!
```

</summary>

</div>