---
title: fbac.dev
description: /home/fbac/docs/ceph
layout: default.liquid
data:
  route: docs
---
# ceph

ceph docs: https://access.redhat.com/documentation/en-us/red_hat_ceph_storage/3/
lifecycle: https://access.redhat.com/articles/1372203
upstream docs: http://docs.ceph.com/docs/luminous/
supported configurations: https://access.redhat.com/articles/1548993

## architecture

- **Monitors (MONs)**
  - Maintain maps of the cluster state and are used to help the other daemons coordinate with each other.
  - The cluster map is a collection of six maps which contain information about the state of the Ceph cluster and its configuration.
  - Monitors provide consensus for distributed decision making. The cluster must be configured with an odd number of monitors.
  - If more than the half of monitors are down, the entire cluster will become inaccessible to all clients. This is necessary to protect the integrity of the cluster's data.

- **Object Storage Devices (OSDs)**, which store data and handle data replication, recovery and rebalancing.
  - OSDs connect a storage device (such as a hard disk or other block device) to the Ceph storage cluster.
  - An individual storage server may run multiple OSD daemons and provide multiple OSDs to the cluster.
  - Ceph currently only supports XFS file systems. Extended Attributes (xattrs) are used to store information about the internal object state, snapshot metadata, and Ceph RADOS Gateway Access Control Lists (ACLs). Extended attributes are enabled by default on XFS file systems.
  - CRUSH algorithm is used to store objects in OSDs (using placement groups)
  - The replication of objects to multiple OSDs is handled automatically. One OSD is the primary OSD for the object's placement group, and Ceph clients always contact the primary OSD in the acting set when it reads or writes data:

        Primary OSD functions:
            Serves all I/O requests
            Replicates and protects the data
            Checks the coherence of the data
            Rebalances the data
            Recovers the data

        Secondary OSD functions:
            Always acts under control of the primary OSD
            Capable of becoming the primary OSD

  - Each OSD has its own OSD journal. Writes from Ceph clients, often random I/O in nature, are written sequentially by the OSD daemon to its journal.
  - OSD journals use raw volumes on the OSD nodes, and should be configured on a separate device, if possible a fast device such as an SSD, for performance-oriented and/or write-intensive environments.

- **Managers (MGRs)**, which keep track of runtime metrics and expose cluster information through a web browser-based dashboard and REST API.

- **Metadata Servers (MDSs)**

  - Provides POSIX-compliant, shared file system metadata management, which supports both directory hierarchy and file metadata, including ownership, time stamps, and mode.
  - MDS uses RADOS instead of local storage to store metadata, and has no access to file content, because it is only required for file access. The MDS is therefore a Ceph component but not a RADOS component.
  - The MDS enables CephFS to interact with the Ceph Object Store, mapping an inode to an object, and remembering where data is stored within a tree. Clients accessing a CephFS file system first make a request to an MDS, which provides the information needed to get files from the correct OSDs.

## Data Distribution and Organization in Ceph

### Pools

Pools are logical partitions of the Ceph storage cluster, used to store objects under a common name tag. Each pool is assigned a specific number of hash buckets to group objects together for storage. These hash buckets are called Placement Groups (PGs)
The number of placement groups configured when the pool is created can be increased dynamically, but can never be decreased.
The CRUSH algorithm is used to select the OSDs hosting the data for a pool. Each pool is assigned a single CRUSH rule for its placement strategy. The CRUSH rule determines which OSDs store the data for all the pools assigned that rule.
A pool name must be specified for each request and permissions are granted for each Ceph user, either to all the pools in the cluster or to one or more specific pools. These permissions can be read, write, or execute.

### Placement Groups

A Placement Group (PG) aggregates a series of objects into a hash bucket, or group, and is mapped to a set of OSDs. An object belongs to only one PG, and all objects belonging to the same PG return the same hash result.

An object is mapped to its PG by the CRUSH algorithm based on the hashing of the object's name. The placement strategy is known as the CRUSH placement rule. The placement rule identifies the failure domain that is to be chosen within the CRUSH topology to receive each replica or erasure code chunk.

When a client writes an object to a pool, it uses the pool's CRUSH placement rule to determine the object's placement group. The client then uses its copy of the cluster map, the placement group, and the CRUSH placement rule to calculate to which OSDs a copy of the object (or its erasure-coded chunks) should be written.

The layer of indirection provided by the placement group is important when new OSDs become available to the Ceph cluster. When OSDs are added to or removed from a cluster, placement groups are automatically rebalanced between operational OSDs.

### Mapping an Object to Its Associated OSDs

A Ceph client gets the latest copy of the cluster map from a monitor. This tells it about all the MONs, OSDs, and MDSs in the cluster. This does not tell it where objects are stored; the client must use CRUSH to compute the location of objects it needs to access.

To calculate the Placement Group ID (PG ID) for an object, the Ceph client needs the object ID and the name of the object's storage pool. The client hashes the object ID, and then calculates the hash modulo the number of PGs to get a PG ID. It then looks up the numeric ID for the pool, based on the pool's name, and prepends the pool ID to the PG ID.

The CRUSH algorithm is then used to determine which OSDs are responsible for a placement group (the Acting Set ). The OSDs in the Acting Set that are currently up are in the Up Set . The first OSD in the Up Set is the current primary OSD for the object's placement group, and all other OSDs in the Up Set are secondary OSDs.

The Ceph client can then directly work with the primary OSD in order to access the object.

## Operating Ceph

### Deploy

deploy: /usr/share/ceph-ansible/site.yml
variables: /usr/share/ceph-ansible/group_vars

- Configure ssh-keys:

```bash
ssh-keygen
for i in a b c d e> do> ssh-copy-id student@server$i> ssh-copy-id ceph@server$i> done
```

- Deployment:
  
  - Configure /etc/ansible/hosts with [mons] and [mgrs]
  - Configure /usr/share/ceph-ansible/group_vars/all.yaml using sample
  - Configure /usr/share/ceph-ansible/site.yaml using sample
  - Run ansible-playbook site.yaml to deploy mgrs and mons
  
  - Configure /usr/share/ceph-ansible/group_vars/osds.yml using sample
  - Configure /etc/ansible/hosts with [osds]
  - Run ansible-playbook site.yaml to deploy osds
  
  - Configure /usr/share/ceph-ansible/clients.yml using sample
  - Configure /etc/ansible/hosts with [clients]
  - Run ansible-playbook --limits=clients site.yaml to deploy osds

- Basic operations:

```bash
sudo systemctl start/stop ceph.target|ceph-mon.target|ceph-osd.target|ceph-mgr.target
```

### Expand

- Add additional osds servers:
  
  - Add new hosts in the [osds] group in the inventory
  - Run ansible-playbook site.yml

- Add additional disks to existing osd servers

  - Add new disks in "devices" inside /usr/share/ceph-ansible/group_vars/osds.yml
  - Run ansible-playbook site.yml

### Deploy N ceph cluster

Copy /usr/share/ceph-ansible to another location and configure ansible.cfg to point to another hosts file.

## Creating replicated pools

https://role.rhu.redhat.com/rol-rhu/app/courses/ceph125-3.0/pages/ch03

### Create

ceph osd pool create pool-name pg-num [pgp-num]  \> [replicated] [crush-ruleset-name] [expected-num-objects]

    pool-name is the name of the new pool.

    pg-num is the total number of Placement Groups (PGs) for this pool.

    pgp-num is the effective number of placement groups for this pool. Normally, this should be equal to the total number of placement groups.

    replicated specifies that this is a replicated pool, and is normally the default if not included in the command.

    crush-ruleset-name is the name of the CRUSH rule set you want to use for this pool. The osd_pool_default_crush_replicated_ruleset configuration parameter sets the default value.

    expected-num-objects is the expected number of objects in the pool. If you know this number in advance, Ceph can prepare a folder structure on the OSD's XFS file system at pool creation time. Otherwise, Ceph reorganizes this directory s
    structure at runtime as the number of objects increases. This reorganization has a latency impact.

ceph osd pool set pool-name size number-of-replicas

### Manage Ceph

#### Set pool type

After creating a pool, administrators must explicitly indicate the type of Ceph applications that will be able to use it.

 ceph osd pool application enable pool-nameapp

  Where app is:

    cephfs for the Ceph File System.
    rbd for the Ceph Block Device.
    rgw for the Ceph Object Gateway. 

    ceph osd pool application enable myfirstpool rbd

#### List pools

ceph osd lspools
ceph osd pool ls detail

#### Statistics

ceph df
ceph osd pool stats

The ceph df command displays pool usage statistics. The ceph osd df command displays disk usage statistics on OSDs.

#### Pool quotas

ceph osd pool set-quota pool-name max_objects obj-count max_bytes bytes

 For example, to limit the myfirstpool pool to 1000 objects, use the following command:
 $ ceph osd pool set-quota myfirstpool max_objects 1000

You can remove a quota by setting its value to 0. Remember that you can review the usage statics of the pools with the ceph osd df command.

#### Rename

ceph osd pool rename current-name new-name

#### Snapshot

- Create or delete:
  
ceph osd pool mksnap pool-name snap-name
ceph osd pool rmsnap pool-name snap-name

- Use:

rados -p pool-name -s snap-name get object-namefile
rados -p pool-name rollback object-name snap-name
rados --id name -p pool -N namespace put name /locla/file/path

#### Modify pools

- Set
ceph osd pool set pool-nameparametervalue

- Get
ceph osd pool get pool-nameparameter

- List
ceph osd pool get pool-name all

#### Delete pool

- Delete
ceph osd pool delete pool-namepool-name --yes-i-really-really-mean-it

- Protect a pool
  
In Red Hat Ceph Storage 3, for extra protection, Ceph sets the mon_allow_pool_delete configuration parameter to false . With this directive, and even with the --yes-i-really-really-mean-it option, the ceph osd pool delete command does not result in the deletion of the pool.

You can set the mon_allow_pool_delete parameter to true and restart the mon services to allow pool deletion.

But even with mon_allow_pool_delete set to true you can still protect your pool from deletion by setting the nodelete option to true at the pool level:

  ceph osd pool set pool-name nodelete true

#### Configuring Namespaces in a Pool

A namespace is a logical group of objects in a pool. A user's access to a pool can be limited so that the user can only store or retrieve objects in that namespace.

By default, each pool contains a namespace with an empty name, known as the default namespace. Consult the Ceph API documentation for instructions on how to pass both the pool and namespace parameters at http://docs.ceph.com/docs/luminous/rados/api/librados/

- Put in a namespace
$ rados -p mytestpool -N system put srv /etc/services

- List a namespace
$ rados -p mytestpool -N system ls

- List all namespaces
$ rados -p mytestpool --all ls
$ rados -p mytestpool --all ls --format=json | python -m json.tool

### Erasure Coding Pools

When you store an object in an erasure coded pool, the object is divided into a number of data chunks, and the data chunks are stored in separate OSDs. In addition, a number of coding chunks are calculated based on the data chunks, and are also stored in different OSDs. The coding chunks can be used to reconstruct the object's data if an OSD containing a chunk fails.

#### Create

ceph osd pool create pool-namepg-num [pgp-num] erasure [erasure-code-profile] [crush-ruleset-name] [expected_num_objects]
ceph osd pool create mysecondpool 50 50 erasure

#### Get erasure profile

ceph osd erasure-code-profile get default

#### Set new erasure profile

ceph osd erasure-code-profile set profile-name arguments...

For example, the following command creates a profile that divides objects into three data chunks ( k=3 ) and protects them with two coding chunks ( m=2 ). The crush-failure-domain=rack parameter ensures that Ceph will not store two chunks in the same rack.

 ceph osd erasure-code-profile set myprofile k=3 m=2 crush-failure-domain=rack

#### List

ceph osd erasure-code-profile ls

#### Remove

ceph osd erasure-code-profile rm profile-name

#### View

ceph osd erasure-code-profile get profile-name

### Configuration

#### View config

ceph daemon type.id config show
  ceph daemon osd.0 config show
  
 ceph daemon type.id config get parameter
  ceph daemon mds.servera config get mds_data

#### Managing the Ceph Configuration File with Ansible

- In the /usr/share/ceph-ansible/group_vars/all.yml variable file, edit the ceph_conf_overrides.
- Run the ansible-playbook site.yml

#### Starting and stopping Ceph daemons

Stop a specific daemon
  systemctl stop ceph- $type @ $id
Stop all OSD daemons
  systemctl stop ceph-osd.target
Stop all daemons
  systemctl stop ceph.target
Start a specific daemon
  systemctl start ceph- $type @ $id
Start all OSD daemons
  systemctl start ceph-osd.target
Start all daemons
  systemctl start ceph.target
Restart a specific daemon
  systemctl restart ceph- $type @ $id
Restart all OSD daemons
  systemctl restart ceph-osd.target
Restart all daemons
  systemctl restart ceph.target

### Managing Ceph Authentication

https://role.rhu.redhat.com/rol-rhu/app/courses/ceph125-3.0/pages/ch03s07

#### Authentication with Cephx

In a Red Hat Ceph Storage cluster, users are used to authorize communication between clients, applications, and daemons in the cluster. To securely authenticate these users, Ceph uses the cephx authentication protocol, based on shared secret keys.

Accounts used by Ceph daemons have names that match the associated daemon: osd.1 or mgr.serverc.
Accounts used by client applications using librados have names that start with client.

$ ceph --id operator3 osd lspools

#### Authorization with Cephx

When you create a new user account, you need to grant it permissions to control what that user is authorized to do in the Red Hat Ceph Storage cluster. Permissions within cephx are known as capabilities , and you grant them by daemon type ( mon , osd , mgr , or mds ).

- **Cephx Capabilities**

Within cephx , and for each daemon type, several capabilities are available:

    r grants read access. Each user account should have at least read access on the Monitors to be able to retrieve the CRUSH map.
    w grants write access. Clients need write access to store and modify objects on OSDs. For Managers (MGRs), w grants the right to enable or disable modules.
    x grants authorization to execute extended object classes. This allows clients to perform extra operations on objects such as setting locks with rados lock get or listing RBD images with rbd list .
    * grants full access.
    class-read and class-write are subsets of x . You mostly use them on pools used for RBD. 

For example, the following command creates the formyapp1 user account, and gives it the capability to store and retrieve objects from any pool:

$ ceph auth get-or-create client.formyapp1 mon 'allow r' osd 'allow rw'

- **Using Profiles to Set Capabilities**

cephx offers predefined capability profiles.

$ ceph auth get-or-create client.forrbd mon 'profile rbd' osd 'profile rbd'

- **Restricting Access**

You should restrict user OSD permissions such that users can only access the pools they need. The following command creates the formyapp2 user and limits their access to read and write on the myapp pool:

$ ceph auth get-or-create client.formyapp2 \> mon 'allow r' \> osd 'allow rw pool=myapp'

 cephx can also restrict access to objects by other means:

    By object name prefix
      $ ceph auth get-or-create client.formyapp3 \> mon 'allow r' \> osd 'allow rw object_prefix pref'

    By namespace
      $ ceph auth get-or-create client.designer \> mon 'allow r' \> osd 'allow rw namespace=photos'

    By path (CephFS)
      $ ceph fs authorize cephfs client.webdesigner  /webcontent rw
      $ ceph auth get client.webdesigner
    
    By Monitor command . This method restricts administrators to a specific list of commands. The following example creates the operator1 user account and limits its access to two commands:
      $ ceph auth get-or-create client.operator1 mon 'allow r, allow command "auth get-or-create", allow command "auth list"'

### User Management

- List users
$ ceph auth list

- Details of an account
$ ceph auth get client.admin

- Print secret key
$ ceph auth print-key client.admin

- Import/export
$ ceph auth export client.operator1 > ~/operator1.export
$ ceph auth import -i ~/operator1.export

#### Creating New User Accounts

$ ceph auth get-or-create client.application1 mon 'allow r' osd 'allow rw' -o /etc/ceph/ceph.client.application1.keyring

#### Modifying User Capabilities

$ ceph auth caps client.application1 mon 'allow r' osd 'allow rw pool=myapp'
$ ceph auth caps client.application1 osd '' (remove)

#### Delete user

$ ceph auth del client.application1

## rbd

### create pool and user

- Create pool, user and initialize
ceph osd pool create rbd 32 32
rbd pool init rbd
ceph auth get-or-create client.rbd.servera mon 'profile rbd' osd 'profile rbd' -o /etc/ceph/ceph.client.rbd.servera.keyring

- Use in servera with:
export CEPH_ARGS='--id=rbd.servera'

- Create rbd and list
rbd create rbd/test --size=128M
rbd ls

- Map to the kernel
sudo rbd --id rbd.servera map rbd/test
/dev/rbd0

- Show
rbd showmapped
id pool image snap device
0  rbd  test  -    /dev/rbd0

- Mount
sudo mkfs.ext4 /dev/rbd0
sudo mkdir /mnt/rbd
sudo mount /dev/rbd0 /mnt/rbd
sudo chown ceph:ceph /mnt/rbd

- Add some file
dd if=/dev/zero of=/tmp/testrbd bs=10M count=1
cp /tmp/testrbd /mnt/rbd/test1
df / ceph df

- Clean
sudo umount /mnt/rbd
sudo rbd --id rbd.servera unmap /dev/rbd0
rbd rm rbd/test
rados -p rbd rm test

### Create a snapshot

- Create rbd, map it to the host and create a filesystem
rbd create rbd/snaptest --size=128M
sudo rbd --id rbd.servera map rbd/snaptest
sudo mkfs.ext4 /dev/rbd0

- Take a snapshot
rbd snap create rbd/snaptest@firstsnap

- Map the snapshot
sudo rbd --id rbd.servera map rbd/snaptest@firstsnap

- Purge snapshots
rbd snap purge rbd/snaptest

- Delete rbd
rbd rm rbd/snaptest

### Cloning rbd

- Create rbd, map it, create filesystem and add content
rbd create rbd/clonetest --size=128M
sudo rbd --id rbd.servera map rbd/clonetest
sudo mkfs.ext4 /dev/rbd0
sudo mkdir /mnt/source
sudo mount /dev/rbd0 /mnt/source
sudo chown ceph:ceph /mnt/source
dd if=/dev/zero of=/mnt/source/fileonsource bs=1M count=10

- Freeze the filesystem and take a snapshot
sudo fsfreeze --freeze /mnt/source
rbd snap create rbd/clonetest@clonesnap
sudo fsfreeze --unfreeze /mnt/source

- Protect snapshot and take a clone from that snapshot
rbd snap protect rbd/clonetest@clonesnap
rbd clone rbd/clonetest@clonesnap rbd/realclone

- Map the clone as a normal rbd

### Export/Import

- Create pool with application rbd, init rbd
ceph osd pool create rbd 32
rbd pool init rbd

- Create rbd, map it to the node, mkfs it, mount and add content
rbd create rbd/test --size=128M
sudo rbd map rbd/test
sudo mkfs.ext4 /dev/rbd0
sudo mkdir /mnt/rbd
sudo mount /dev/rbd0 /mnt/rbd
sudo chown ceph:ceph /mnt/rbd
cp /etc/ceph/ceph.conf /mnt/rbd/file0

- Export the rbd
rbd export rbd/test ~/export.dat

- Import it in other server, then you can map it, mount, change...
rbd import export.dat rbd/test

- Export with snapshots: create snapshots
rbd snap create rbd/test@firstsnap
rbd snap create rbd/test@secondsnap

- Export snapshots with export-diff
rbd export-diff --from-snap firstsnap rbd/test@secondsnap - | ssh serverf rbd import-diff - rbd/test

## radosgw

- Deploy
ansible-playbook site.yml --limit rgws

- Create user
radosgw-admin user create --uid="operator" --display-name="S3 Operator" --email="operator@example.com" --access_key="12345" --secret="67890"

- Create admin user
radosgw-admin user create --uid=admin --display-name="Admin User" --caps="users=read,write;usage=read,write;buckets=read,write;zone=read,write" --access-key="abcde" --secret="qwerty"

- Configure s3cmd

- Create bucket
  s3cmd mb --acl-public s3://servera/my-bucket

- View bucket metadata
radosgw-admin metadata get bucket:my-bucket

## cephfs

- Deploy
ansible-playbook site.yml --limit mdss

- Mount
ceph auth get-key client.admin | sudo tee /root/asecret
sudo mount -t ceph serverc:/ /mnt/cephfs -o name=admin,secretfile=/root/asecret

- Snapshots
sudo ceph mds set allow_new_snaps true --yes-i-really-mean-it
sudo ceph mds set allow_new_snaps false