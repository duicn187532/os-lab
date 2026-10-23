/* Linux / POSIX pipe + fork + wait. Compile: cc -std=c11 -Wall -Wextra -Werror pipe-demo.c -o pipe-demo */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>
static void die(const char *s) { perror(s); exit(1); }
int main(void) {
    int fd[2];
    if(pipe(fd) == -1) die("pipe");
    pid_t child=fork();
    if(child == -1) die("fork");
    if(child == 0) {
        if(close(fd[1]) == -1) _exit(2);
        char buf[16];
        ssize_t n;
        while((n=read(fd[0],buf,sizeof buf)) != 0) {
            if(n < 0) { if(errno==EINTR) continue; _exit(3); }
            for(ssize_t i=0;i<n;) {
                ssize_t m=write(STDOUT_FILENO,buf+i,(size_t)(n-i));
                if(m < 0 && errno==EINTR) continue;
                if(m <= 0) _exit(4);
                i+=m;
            }
        }
        close(fd[0]); _exit(0);
    }
    if(close(fd[0]) == -1) die("close read end");
    const char msg[]="hello IPC\n";
    for(size_t i=0;i<sizeof msg-1;) {
        ssize_t n=write(fd[1],msg+i,sizeof msg-1-i);
        if(n<0 && errno==EINTR) continue;
        if(n<=0) die("write");
        i+=(size_t)n;
    }
    if(close(fd[1])==-1) die("close write end");
    int status;
    if(waitpid(child,&status,0)==-1) die("waitpid");
    if(!WIFEXITED(status) || WEXITSTATUS(status)!=0) return 5;
    return 0;
}
