/* OS LAB: bounded producer-consumer POSIX pthread lab (real Linux threads).
 * 4 producers x 2000 distinct values; 4 consumers; queue capacity only 7.
 * Every shared queue/counter/seen[] mutation takes the same mutex.
 * Condition waits use while loops to tolerate spurious wakeups and contention.
 */
#define _POSIX_C_SOURCE 200809L
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
enum { PRODUCERS = 4, CONSUMERS = 4, PER_PRODUCER = 2000,
       TOTAL = PRODUCERS * PER_PRODUCER, CAPACITY = 7 };
struct state {
    pthread_mutex_t mutex;
    pthread_cond_t not_empty, not_full;
    int ring[CAPACITY], head, tail, size, peak;
    int active_producers, produced, consumed, duplicates, invalid;
    unsigned char seen[TOTAL];
    int64_t checksum;
};
static struct state S;
static void ck(int status, const char *what) {
    if(status != 0) { fprintf(stderr, "%s: %s\n", what, strerror(status)); exit(1); }
}
static void *producer(void *ptr) {
    int id=(int)(intptr_t)ptr;
    for(int i=0;i<PER_PRODUCER;i++){
        ck(pthread_mutex_lock(&S.mutex),"lock");
        while(S.size == CAPACITY)ck(pthread_cond_wait(&S.not_full,&S.mutex),"wait full");
        S.ring[S.tail]=id*PER_PRODUCER+i;
        S.tail=(S.tail+1)%CAPACITY;
        S.size++;S.produced++;
        if(S.size>S.peak)S.peak=S.size;
        ck(pthread_cond_signal(&S.not_empty),"signal not empty");
        ck(pthread_mutex_unlock(&S.mutex),"unlock");
    }
    ck(pthread_mutex_lock(&S.mutex),"lock");
    S.active_producers--;
    /* Every blocked consumer must re-evaluate the shutdown predicate. */
    ck(pthread_cond_broadcast(&S.not_empty),"broadcast shutdown");
    ck(pthread_mutex_unlock(&S.mutex),"unlock");
    return NULL;
}
static void *consumer(void *unused) {
    (void)unused;
    for(;;){
        ck(pthread_mutex_lock(&S.mutex),"lock");
        while(S.size==0 && S.active_producers>0)
            ck(pthread_cond_wait(&S.not_empty,&S.mutex),"wait empty");
        if(S.size==0){
            ck(pthread_mutex_unlock(&S.mutex),"unlock");break;
        }
        int value=S.ring[S.head];
        S.head=(S.head+1)%CAPACITY;
        S.size--;S.consumed++;
        if(value<0||value>=TOTAL)S.invalid++;
        else {
            if(S.seen[value])S.duplicates++;
            S.seen[value]=1;
            S.checksum+=value;
        }
        ck(pthread_cond_signal(&S.not_full),"signal not full");
        ck(pthread_mutex_unlock(&S.mutex),"unlock");
    }
    return NULL;
}
int main(void){
    S.active_producers=PRODUCERS;
    ck(pthread_mutex_init(&S.mutex,NULL),"mutex init");
    ck(pthread_cond_init(&S.not_empty,NULL),"empty cond");
    ck(pthread_cond_init(&S.not_full,NULL),"full cond");
    pthread_t p[PRODUCERS],c[CONSUMERS];
    for(int i=0;i<CONSUMERS;i++)ck(pthread_create(&c[i],NULL,consumer,NULL),"create consumer");
    for(int i=0;i<PRODUCERS;i++)ck(pthread_create(&p[i],NULL,producer,(void *)(intptr_t)i),"create producer");
    for(int i=0;i<PRODUCERS;i++)ck(pthread_join(p[i],NULL),"join producer");
    for(int i=0;i<CONSUMERS;i++)ck(pthread_join(c[i],NULL),"join consumer");
    const int64_t expected=(int64_t)(TOTAL-1)*TOTAL/2;
    int missing=0;
    for(int i=0;i<TOTAL;i++)if(!S.seen[i])missing++;
    if(S.produced!=TOTAL||S.consumed!=TOTAL||S.size!=0||
       S.duplicates||S.invalid||missing||S.checksum!=expected||
       S.peak<1||S.peak>CAPACITY) {
        fprintf(stderr,"FAILED conservation: produced=%d consumed=%d queued=%d duplicate=%d invalid=%d missing=%d sum=%lld peak=%d\n",
                S.produced,S.consumed,S.size,S.duplicates,S.invalid,missing,
                (long long)S.checksum,S.peak);
        return 1;
    }
    printf("produced=%d consumed=%d checksum=%lld duplicates=%d\n",
           S.produced,S.consumed,(long long)S.checksum,S.duplicates);
    ck(pthread_cond_destroy(&S.not_empty),"cond destroy");
    ck(pthread_cond_destroy(&S.not_full),"cond destroy");
    ck(pthread_mutex_destroy(&S.mutex),"mutex destroy");
    return 0;
}
