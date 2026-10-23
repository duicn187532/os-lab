/* Linux/WSL2 native observations: syscall errno, pipe byte stream, DAC bits,
 * PID namespace, cgroup metadata, rusage. Does NOT certify access control
 * against root/ACL/capabilities or prove cross-container isolation. */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <unistd.h>
static void need(int yes, const char *why) {
 if(!yes){fprintf(stderr,"FAIL %s: %s\n",why,strerror(errno));exit(1);}
}
int main(void){
 char path[]="/tmp/os-lab-sys-XXXXXX";
 int fd=mkstemp(path);need(fd>=0,"mkstemp");
 need(unlink(path)==0,"unlink");
 need(fchmod(fd,0640)==0,"fchmod");
 struct stat st={0};need(fstat(fd,&st)==0,"fstat");
 need((st.st_mode&0777)==0640,"0640 mode bits");
 need((st.st_mode&S_IWGRP)==0,"group write disabled");
 need(close(fd)==0,"close");
 int p[2];need(pipe(p)==0,"pipe");
 int flags=fcntl(p[0],F_GETFL);need(flags>=0,"get flags");
 need(fcntl(p[0],F_SETFL,flags|O_NONBLOCK)>=0,"set nonblocking");
 char a=0,d=0;
 errno=0;
 ssize_t n=read(p[0],&a,1);
 need(n==-1&&(errno==EAGAIN||errno==EWOULDBLOCK),"EAGAIN when writer open");
 need(write(p[1],"AB",2)==2,"write AB");
 need(read(p[0],&a,1)==1&&a=='A',"short read A");
 need(read(p[0],&d,1)==1&&d=='B',"short read B");
 need(close(p[1])==0,"close writer");
 need(read(p[0],&a,1)==0,"EOF when empty and writers closed");
 need(close(p[0])==0,"close reader");
 char ns[128];
 n=readlink("/proc/self/ns/pid",ns,sizeof(ns)-1);
 need(n>0&&n<(ssize_t)sizeof(ns),"PID namespace link");
 ns[n]='\0';need(strncmp(ns,"pid:[",5)==0,"PID namespace shape");
 int cg=open("/proc/self/cgroup",O_RDONLY|O_CLOEXEC);
 need(cg>=0,"cgroup metadata present");need(close(cg)==0,"close cgroup");
 struct rusage ru;need(getrusage(RUSAGE_SELF,&ru)==0,"getrusage");
 need(ru.ru_minflt>=0&&ru.ru_majflt>=0,"page fault counters valid");
 puts("pipe=EAGAIN,AB,EOF mode=0640 group_write=0 pid_namespace=1 cgroup=1 rusage=1");
 return 0;
}
