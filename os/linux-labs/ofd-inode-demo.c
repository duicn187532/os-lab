/* Real Linux inode name, hard-link, OFD, dup and fork semantics.
 * Creates and removes ONLY a private temporary directory.
 * stdout: links=0 dup_shared=AB fork_shared=CD file_retained=yes
 */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
static void die(const char *s){perror(s);exit(1);}
static void check(int ok,const char *s){if(!ok){fprintf(stderr,"check failed: %s\n",s);exit(1);}}
static char take(int fd){
 char c;ssize_t n;
 do{n=read(fd,&c,1);}while(n==-1&&errno==EINTR);
 if(n!=1)die("read byte");
 return c;
}
int main(void){
 char dir[]="/tmp/os-lab-ofd-XXXXXX";
 if(!mkdtemp(dir))die("mkdtemp");
 char name[200],alias[200];
 int n=snprintf(name,sizeof name,"%s/original",dir);
 check(n>0&&(size_t)n<sizeof name,"name length");
 n=snprintf(alias,sizeof alias,"%s/alias",dir);
 check(n>0&&(size_t)n<sizeof alias,"alias length");
 int fd=open(name,O_CREAT|O_EXCL|O_RDWR,0600);
 if(fd<0)die("open");
 const char *payload="ABCDE";
 if(write(fd,payload,5)!=5)die("write");
 if(link(name,alias)!=0)die("link");
 struct stat st;
 if(fstat(fd,&st)!=0)die("fstat two links");
 check(st.st_nlink==2,"two names for one inode");
 if(unlink(name)!=0)die("unlink original");
 if(fstat(fd,&st)!=0)die("fstat one link");
 check(st.st_nlink==1,"one link remains");
 if(unlink(alias)!=0)die("unlink alias");
 if(fstat(fd,&st)!=0)die("fstat no links");
 check(st.st_nlink==0,"unlinked inode remains open");
 if(lseek(fd,0,SEEK_SET)!=0)die("lseek");
 const int aliasfd=dup(fd);
 if(aliasfd<0)die("dup");
 const char a=take(aliasfd),b=take(fd);
 check(a=='A'&&b=='B',"dup shares one open file description offset");
 pid_t child=fork();
 if(child<0)die("fork");
 if(child==0){
  const char ch=take(fd);
  _exit(ch=='C'?0:15);
 }
 int status=0;pid_t waited;
 do{waited=waitpid(child,&status,0);}while(waited<0&&errno==EINTR);
 if(waited!=child)die("waitpid");
 check(WIFEXITED(status)&&WEXITSTATUS(status)==0,"child read C");
 const char d=take(fd);
 check(d=='D',"fork inherited fd shares open file description offset");
 const char e=take(aliasfd);
 check(e=='E',"still readable with zero directory entries");
 puts("links=0 dup_shared=AB fork_shared=CD file_retained=yes");
 if(close(aliasfd)!=0||close(fd)!=0)die("close");
 if(rmdir(dir)!=0)die("rmdir");
 return 0;
}
