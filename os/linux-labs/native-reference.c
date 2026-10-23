/* OS LAB instructor implementation shared by C11 and C++17 (valid in both).
 * Build a per-chapter source by changing "#define CHAPTER -1" to 0..28.
 * This is a teaching reference for ABSTRACT input/output problems.
 * Native Linux POSIX lab verification is separate.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define CHAPTER -1
int main(void) {
 int q;
 if(scanf("%d",&q)!=1)return 0;
 while(q--){
  if(CHAPTER==0){int pc,len;scanf("%d%d",&pc,&len);printf("%d\n",pc+len);}
  else if(CHAPTER==1){int r;scanf("%d",&r);puts(r<0?"ERROR":r==0?"ZERO":"SUCCESS");}
  else if(CHAPTER==2||CHAPTER==14){int n;scanf("%d",&n);printf("%d\n",1<<n);}
  else if(CHAPTER==3){
   char s[32];scanf("%31s",s);
   puts(!strcmp(s,"STACK")||!strcmp(s,"PC")||!strcmp(s,"REG")?"PRIVATE":"SHARED");
  }else if(CHAPTER==4){
   int at[3],bt[3],ord[]={0,1,2},wt[3],time=0;
   for(int i=0;i<3;i++)scanf("%d%d",&at[i],&bt[i]);
   for(int i=0;i<3;i++)for(int j=i+1;j<3;j++)
    if(at[ord[j]]<at[ord[i]]||(at[ord[j]]==at[ord[i]]&&ord[j]<ord[i])){
     int temp=ord[i];ord[i]=ord[j];ord[j]=temp;
    }
   for(int i=0;i<3;i++){
    int k=ord[i],start=time>at[k]?time:at[k];
    wt[k]=start-at[k];time=start+bt[k];
   }
   printf("%d %d %d\n",wt[0],wt[1],wt[2]);
  }else if(CHAPTER==5){int x;scanf("%d",&x);printf("%d\n",x+1);}
  else if(CHAPTER==6){int va,p;scanf("%d%d",&va,&p);printf("%d %d\n",va/p,va%p);}
  else if(CHAPTER==7){
   int cap,n,frames[10000],len=0,miss=0,p;
   scanf("%d%d",&cap,&n);
   while(n--){
    scanf("%d",&p);int hit=0;
    for(int k=0;k<len;k++)if(frames[k]==p){hit=1;break;}
    if(!hit){
     miss++;
     if(len==cap){for(int k=1;k<len;k++)frames[k-1]=frames[k];len--;}
     frames[len++]=p;
    }
   }
   printf("%d\n",miss);
  }else if(CHAPTER==8){
   int n,add,remove;scanf("%d%d%d",&n,&add,&remove);
   printf("%d\n",n+add-remove);
  }else if(CHAPTER==9){
   int ready,nonblocking;scanf("%d%d",&ready,&nonblocking);
   puts(ready>0?"READ":nonblocking?"EAGAIN":"BLOCK");
  }else if(CHAPTER==10){
   int bits[3];char principal[8],op[8],type[8];
   scanf("%d%d%d%7s%7s%7s",&bits[0],&bits[1],&bits[2],principal,op,type);
   int index=!strcmp(principal,"O")?0:!strcmp(principal,"G")?1:2;
   int mask=!strcmp(op,"R")?4:!strcmp(op,"W")?2:1;
   puts(bits[index]&mask?"ALLOW":"DENY");
  }else if(CHAPTER==11){
   int quota,period;scanf("%d%d",&quota,&period);printf("%d\n",100*quota/period);
  }else if(CHAPTER==12){
   int lambda,w;scanf("%d%d",&lambda,&w);printf("%d\n",lambda*w);
  }else if(CHAPTER==13){
   int start[4],stop[4],total=0,end=-1;
   for(int i=0;i<4;i++)scanf("%d%d",&start[i],&stop[i]);
   for(int i=0;i<4;i++)for(int j=i+1;j<4;j++)if(start[j]<start[i]){
    int temp=start[i];start[i]=start[j];start[j]=temp;
    temp=stop[i];stop[i]=stop[j];stop[j]=temp;
   }
   for(int i=0;i<4;i++){
    int from=start[i]>end?start[i]:end;
    if(stop[i]>from)total+=stop[i]-from;
    if(stop[i]>end)end=stop[i];
   }
   printf("%d\n",total);
  }else if(CHAPTER==15){
   char key[32];scanf("%31s",key);
   puts(!strcmp(key,"SAVE")?"STORAGE":!strcmp(key,"RUN")?"SCHED":
    !strcmp(key,"LOCK")?"SYNC":!strcmp(key,"FSYNC")?"SYNCIO":
    !strcmp(key,"WAIT")?"PROCESS":"MEMORY");
  }else if(CHAPTER==16){
   int cap,count;scanf("%d%d",&cap,&count);printf("%d %d\n",cap-count,count);
  }else if(CHAPTER==17){
   int a[10];for(int i=0;i<10;i++)scanf("%d",&a[i]);
   int work[]={a[0],a[1]},alloc[2][2]={{a[2],a[3]},{a[6],a[7]}};
   int max[2][2]={{a[4],a[5]},{a[8],a[9]}};
   int done[]={0,0},order[2],safe=1;
   for(int round=0;round<2;round++){
    int choice=-1;
    for(int i=0;i<2;i++)if(!done[i]&&
     max[i][0]-alloc[i][0]<=work[0]&&max[i][1]-alloc[i][1]<=work[1]){
      choice=i;break;
    }
    if(choice<0){safe=0;break;}
    done[choice]=1;order[round]=choice;
    for(int k=0;k<2;k++)work[k]+=alloc[choice][k];
   }
   if(safe)printf("SAFE P%dP%d\n",order[0],order[1]);
   else puts("UNSAFE");
  }else if(CHAPTER==18){
   int block[3],req[3],chosen[3];
   for(int i=0;i<3;i++)scanf("%d",&block[i]);
   for(int i=0;i<3;i++)scanf("%d",&req[i]);
   for(int i=0;i<3;i++){
    chosen[i]=-1;
    for(int j=0;j<3;j++)if(block[j]>=req[i]){chosen[i]=j;block[j]-=req[i];break;}
   }
   printf("%d %d %d\n",chosen[0],chosen[1],chosen[2]);
  }else if(CHAPTER==19){
   int h,req[4],fcfs=0,last;scanf("%d",&h);last=h;
   for(int i=0;i<4;i++){scanf("%d",&req[i]);fcfs+=abs(req[i]-last);last=req[i];}
   int seen[]={0,0,0,0},sstf=0;last=h;
   for(int step=0;step<4;step++){
    int chosen=-1;
    for(int i=0;i<4;i++)if(!seen[i]&&(chosen<0||
      abs(req[i]-last)<abs(req[chosen]-last)||
      (abs(req[i]-last)==abs(req[chosen]-last)&&req[i]<req[chosen])))chosen=i;
    sstf+=abs(req[chosen]-last);last=req[chosen];seen[chosen]=1;
   }
   printf("%d %d\n",fcfs,sstf);
  }else if(CHAPTER==20){
   int level,full,boost;scanf("%d%d%d",&level,&full,&boost);
   printf("%d\n",boost?0:full?(level+1>2?2:level+1):level);
  }else if(CHAPTER==21){
   char stage[16];scanf("%15s",stage);
   int p=!strcmp(stage,"FW")?0:!strcmp(stage,"BOOT")?1:
    !strcmp(stage,"KERNEL")?2:!strcmp(stage,"ROOT")?3:4;
   printf("%d\n",p);
  }else if(CHAPTER==22){
   int writers,bytes;scanf("%d%d",&writers,&bytes);
   puts(bytes>0?"DATA":writers==0?"EOF":"BLOCK");
  }else if(CHAPTER==23){
   int ready[4],first=-1;
   for(int i=0;i<4;i++){scanf("%d",&ready[i]);if(ready[i]&&first<0)first=i;}
   if(first<0)puts("WAIT");else printf("%d\n",first);
  }else if(CHAPTER==24){
   char mode[16],writer[16];int oldval,newval;
   scanf("%15s%15s%d%d",mode,writer,&oldval,&newval);
   if(strcmp(mode,"PRIVATE"))printf("%d %d\n",newval,newval);
   else if(!strcmp(writer,"P"))printf("%d %d\n",newval,oldval);
   else printf("%d %d\n",oldval,newval);
  }else if(CHAPTER==25){
   int r[3],hand,picked[3];
   scanf("%d%d%d%d",&r[0],&r[1],&r[2],&hand);
   for(int k=0;k<3;k++){
    while(r[hand]){r[hand]=0;hand=(hand+1)%3;}
    picked[k]=hand;r[hand]=1;hand=(hand+1)%3;
   }
   printf("%d %d %d %d\n",picked[0],picked[1],picked[2],hand);
  }else if(CHAPTER==26){
   int oldval,newval,state=0,invalid=0;char events[3][8];
   scanf("%d%d%7s%7s%7s",&oldval,&newval,events[0],events[1],events[2]);
   for(int i=0;i<3;i++){
    if(!strcmp(events[i],"X"))break;
    if(state==0&&!strcmp(events[i],"L"))state=1;
    else if(state==1&&!strcmp(events[i],"C"))state=2;
    else if(state==2&&!strcmp(events[i],"A"))state=3;
    else {invalid=1;break;}
   }
   if(invalid)puts("INVALID");else printf("%d\n",state>=2?newval:oldval);
  }else if(CHAPTER==27){
   char mode[8];int remaining,edge;
   scanf("%7s%d%d",mode,&remaining,&edge);
   puts((!strcmp(mode,"LT")?remaining>0:edge==1)?"NOTIFY":"NO");
  }else if(CHAPTER==28){
   char symptom[32];scanf("%31s",symptom);
   puts(!strcmp(symptom,"MEMORY")?"PROC":
    !strcmp(symptom,"CPU_QUOTA")?"CGROUP":
    !strcmp(symptom,"SYSCALL")?"STRACE":
    !strcmp(symptom,"IO_WAIT")?"IOSTAT":"PERF");
  }else{fputs("CHAPTER 0..28 required\n",stderr);return 2;}
 }
 return 0;
}
