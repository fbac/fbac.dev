---
title: About fbac
published_date: "2022-05-29 15:09:05 +0000"
layout: default.liquid
is_draft: false
---
# [fbac.dev](https://github.com/fbac)

## **`[guest@localhost /]$ su - fbac`**

```bash
Password: **********
Authentication succeded!
```

### **`[fbac@localhost ~]$ cat about.md`**

Hello, there! 👋🏻

My name is **Borja**, and I grew up surrounded by computers. The first OS I used was MS-DOS as kid, in a really old Olivetti M380 XP3 80386. I loved since the very beggining changing batch and system files, just to see _what would happen if I change this thing I don't event understand_. Those were fun times for my father.

Eventually I fell in love with operating systems and opensource development.

Nowadays, my key expertise areas are Red Hat OpenShift, Kubernetes, programming and automation & CI/CD. And I still love kernel and networking problems, as debugging complex low-level stuff is my main passion.

My current role is **Principal Software Engineer**@**Red Hat**, where I'm mainly focused in the architecture and developing of software pieces focused in OpenShift, Kubernetes, container runtimes, bugfixing and contributing in whatever project I stumble upon.

I guess I just perform some software engineer stuff.

### **`[fbac@localhost ~]$ cat skills.yaml`**

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

### **`[fbac@localhost ~]$ cat hobbies.md`**

In my free time I like to...

- Spend time with my **wife**, **son** and **family** is my **key priority**!
- **Healthy living**: gym rat, meditation, hiking and dieting with a goal in mind.
- **Board games**: wargaming, strategy, horror or dungeon crawlers... I'm just addicted to them all.
- **Video games**: currently playing **Dead Cells**.
- **Learning** and **hacking**: I just can't stop and whenever I have some free time I continue my learning process. Currently learning **Rust**.

### **`[fbac@localhost ~]$ cat contact.md`**

I can be contacted at [me@fbac.dev](mailto:me@fbac.dev)

Feel free to reach me to say hello. I'm always eager to participate and contribute in new projects!

Also, I'm active in:

- ![Github](https://findicons.com/files/icons/2779/simple_icons/16/github_16_black.png) [Github](https://github.com/fbac)
- ![Linkedin](https://www.linkedin.com/favicon.ico) [Linkedin](https://www.linkedin.com/in/fbac/)
- ![Twitter](https://twitter.com/favicon.ico) [Twitter](https://twitter.com/0xfbac)

### **`[fbac@localhost ~]$ logout`**

```bash

Goodbye!

```