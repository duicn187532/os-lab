/* POSIX/Linux durable rename pattern in a throwaway directory.
 * cc -std=c11 -Wall -Wextra -Werror durable-replace.c -o durable-replace
 * ./durable-replace /tmp/os-lab-test-directory  */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
static void die(const char *s){perror(s);exit(1);}
static void write_all(int fd,const char*str){
    size_t len=strlen(str);
    while(len){ssize_t n=write(fd,str,len);if(n<0&&errno==EINTR)continue;if(n<=0)die("write");str+=n;len-=(size_t)n;}
}
int main(int argc,char**argv){
    if(argc!=2){fprintf(stderr,"usage: %s DIRECTORY\n",argv[0]);return 2;}
    const char*dir=argv[1];
    if(mkdir(dir,0700)<0&&errno!=EEXIST)die("mkdir");
    int d=open(dir,O_RDONLY|O_DIRECTORY);
    if(d<0)die("open directory");
    int fd=openat(d,"file.tmp",O_WRONLY|O_CREAT|O_TRUNC,0600);
    if(fd<0)die("create temporary");
    write_all(fd,"durable demo\n");
    if(fsync(fd)<0)die("fsync file");
    if(close(fd)<0)die("close file");
    if(renameat(d,"file.tmp",d,"file.txt")<0)die("rename");
    if(fsync(d)<0)die("fsync directory");
    if(close(d)<0)die("close dir");
    puts("renamed and synced (within filesystem/hardware guarantees)");
    return 0;
}
