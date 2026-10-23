/* mmap MAP_PRIVATE + fork: child writes do not change parent's data.
 * cc -std=c11 -Wall -Wextra -Werror cow-demo.c -o cow-demo */
#define _GNU_SOURCE
#include <sys/mman.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
int main(void){
    int *p=mmap(NULL,4096,PROT_READ|PROT_WRITE,MAP_ANONYMOUS|MAP_PRIVATE,-1,0);
    if(p==MAP_FAILED){perror("mmap");return 2;}
    *p=5;
    pid_t c=fork();
    if(c<0){perror("fork");return 3;}
    if(c==0){*p=9;_exit(*p==9?0:1);}
    int status;
    if(waitpid(c,&status,0)<0){perror("waitpid");return 4;}
    printf("parent=%d\n",*p);
    int unchanged=(*p==5);
    if(munmap(p,4096)<0){perror("munmap");return 5;}
    return (unchanged && WIFEXITED(status) && WEXITSTATUS(status)==0)?0:1;
}
