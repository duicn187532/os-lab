/* POSIX mutex + condition variable, predicate in a while loop.
 * cc -std=c11 -Wall -Wextra -Werror -pthread condvar-demo.c -o condvar-demo */
#define _POSIX_C_SOURCE 200809L
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
static pthread_mutex_t lock=PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t cv=PTHREAD_COND_INITIALIZER;
static int ready=0,seen=0;
static void fail(int e){ if(e){fprintf(stderr,"pthread error %d\n",e);exit(2);} }
static void* consumer(void *ignored){
    (void)ignored;
    fail(pthread_mutex_lock(&lock));
    while(!ready) fail(pthread_cond_wait(&cv,&lock));
    seen=1;
    fail(pthread_mutex_unlock(&lock));
    return NULL;
}
int main(void){
    pthread_t t;
    fail(pthread_create(&t,NULL,consumer,NULL));
    fail(pthread_mutex_lock(&lock));
    ready=1;
    fail(pthread_cond_signal(&cv));
    fail(pthread_mutex_unlock(&lock));
    fail(pthread_join(t,NULL));
    printf("ready=%d seen=%d\n",ready,seen);
    fail(pthread_cond_destroy(&cv));
    fail(pthread_mutex_destroy(&lock));
    return seen?0:1;
}
