/* Eight algorithm-heavy OS LAB capstones in portable C11 / C++17.
 * Generate a standalone chapter by replacing "#define CHALLENGE -1"
 * with 0..7 (srtf,lru,banker,pagetable,clock,journal,alloc,epoll).
 * All work is computed from input; no expected results are hardcoded.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define CHALLENGE -1
int main(void){
 int q;if(scanf("%d",&q)!=1)return 0;
 while(q--){
  if(CHALLENGE==0){
   int n,at[8],bt[8],left[8],first[8],finish[8];
   scanf("%d",&n);
   for(int i=0;i<n;i++){
    scanf("%d%d",&at[i],&bt[i]);
    left[i]=bt[i];first[i]=-1;finish[i]=-1;
   }
   int time=0,complete=0;
   while(complete<n){
    int pick=-1;
    for(int i=0;i<n;i++)if(at[i]<=time&&left[i]>0){
     if(pick<0||left[i]<left[pick]||
        (left[i]==left[pick]&&(at[i]<at[pick]||
          (at[i]==at[pick]&&i<pick))))pick=i;
    }
    if(pick<0){
     int next=-1;
     for(int i=0;i<n;i++)if(left[i]>0&&(next<0||at[i]<next))next=at[i];
     if(next<0){fputs("SRTF inconsistent state\n",stderr);return 2;}
     time=next;continue;
    }
    if(first[pick]<0)first[pick]=time;
    left[pick]--;time++;
    if(left[pick]==0){finish[pick]=time;complete++;}
   }
   int waiting=0,response=0;
   for(int i=0;i<n;i++){
    waiting+=finish[i]-at[i]-bt[i];
    response+=first[i]-at[i];
   }
   printf("%d %d\n",waiting,response);
  }else if(CHALLENGE==1){
   int cap,n,frames[128],len=0,faults=0,hits=0;
   scanf("%d%d",&cap,&n);
   for(int t=0;t<n;t++){
    int page;scanf("%d",&page);int found=-1;
    for(int i=0;i<len;i++)if(frames[i]==page){found=i;break;}
    if(found>=0){
     hits++;for(int i=found+1;i<len;i++)frames[i-1]=frames[i];
     len--;
    }else{
     faults++;if(len==cap){
      for(int i=1;i<len;i++){frames[i-1]=frames[i];}
      len--;
     }
    }
    frames[len++]=page;
   }
   printf("%d %d\n",faults,hits);
  }else if(CHALLENGE==2){
   int n,work[2],alloc[8][2],need[8][2],done[8]={0},order[8],safe=1;
   scanf("%d%d%d",&n,&work[0],&work[1]);
   for(int i=0;i<n;i++){
    int maxa,maxb;
    scanf("%d%d%d%d",&alloc[i][0],&alloc[i][1],&maxa,&maxb);
    need[i][0]=maxa-alloc[i][0];need[i][1]=maxb-alloc[i][1];
   }
   for(int step=0;step<n;step++){
    int picked=-1;
    for(int i=0;i<n;i++)if(!done[i]&&
      need[i][0]<=work[0]&&need[i][1]<=work[1]){picked=i;break;}
    if(picked<0){safe=0;break;}
    done[picked]=1;order[step]=picked;
    work[0]+=alloc[picked][0];work[1]+=alloc[picked][1];
   }
   if(!safe)puts("UNSAFE");
   else{
    fputs("SAFE",stdout);
    for(int i=0;i<n;i++)printf(" %d",order[i]);
    putchar('\n');
   }
  }else if(CHALLENGE==3){
   int pageSize,vpn,pfn,present,writable,executable,va;char access;
   scanf("%d%d%d%d%d%d %c%d",&pageSize,&vpn,&pfn,
    &present,&writable,&executable,&access,&va);
   if(!present||va/pageSize!=vpn)puts("PAGE_FAULT");
   else if((access=='W'&&!writable)||(access=='X'&&!executable))puts("PROTECTION");
   else printf("%d\n",pfn*pageSize+va%pageSize);
  }else if(CHALLENGE==4){
   int bits[3],hand,m;
   scanf("%d%d%d%d%d",&bits[0],&bits[1],&bits[2],&hand,&m);
   for(int miss=0;miss<m;miss++){
    while(bits[hand]==1){bits[hand]=0;hand=(hand+1)%3;}
    if(miss)putchar(',');
    printf("%d",hand);
    bits[hand]=1;hand=(hand+1)%3;
   }
   printf(" %d%d%d\n",bits[0],bits[1],bits[2]);
  }else if(CHALLENGE==5){
   int value,commits=0;scanf("%d",&value);
   for(int i=0;i<3;i++){
    int proposed,commit;
    scanf("%d%d",&proposed,&commit);
    if(commit==1){value=proposed;commits++;}
   }
   printf("%d %d\n",value,commits);
  }else if(CHALLENGE==6){
   int blocks[3],req[3],chosen[3];
   for(int i=0;i<3;i++)scanf("%d",&blocks[i]);
   for(int i=0;i<3;i++)scanf("%d",&req[i]);
   for(int i=0;i<3;i++){
    chosen[i]=-1;
    for(int j=0;j<3;j++)if(blocks[j]>=req[i]){
     chosen[i]=j;blocks[j]-=req[i];break;
    }
   }
   printf("%d %d %d | %d %d %d\n",
    chosen[0],chosen[1],chosen[2],blocks[0],blocks[1],blocks[2]);
  }else if(CHALLENGE==7){
   char mode[8];int take,arrivals[3],buffer=0,notifications=0;
   scanf("%7s%d%d%d%d",mode,&take,&arrivals[0],&arrivals[1],&arrivals[2]);
   for(int i=0;i<3;i++){
    buffer+=arrivals[i];
    if((!strcmp(mode,"LT")&&buffer>0)||
       (!strcmp(mode,"ET")&&arrivals[i]>0)){
     notifications++;
     int consumed=buffer<take?buffer:take;
     buffer-=consumed;
    }
   }
   printf("%d %d\n",notifications,buffer);
  }else{fputs("CHALLENGE 0..7 required\n",stderr);return 2;}
 }
 return 0;
}
