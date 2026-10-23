/* Real Linux epoll LT versus ET after a partial nonblocking read.
 * A socketpair avoids ports, elevated permissions, background services and
 * nondeterministic network scheduling.
 * For ET, a fresh write creates a new readiness edge; the unread tail does not.
 * Commands: cc -std=c11 -Wall -Wextra -Werror epoll-demo.c -o epoll-demo
 *           ./epoll-demo
 */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <unistd.h>

static void die(const char *what) { perror(what); exit(1); }
static void check(int ok, const char *what) {
    if (!ok) { fprintf(stderr, "invariant failed: %s\n", what); exit(1); }
}
static void send_exact(int fd, const char *data, size_t length) {
    for (size_t used = 0; used < length;) {
        ssize_t n = write(fd, data + used, length - used);
        if (n == -1 && errno == EINTR) continue;
        if (n <= 0) die("socket write");
        used += (size_t)n;
    }
}
static int wait_events(int fd, int timeout_ms) {
    struct epoll_event event = {0};
    int count;
    do { count = epoll_wait(fd, &event, 1, timeout_ms); }
    while (count == -1 && errno == EINTR);
    if (count < 0) die("epoll_wait");
    if (count > 0) check((event.events & EPOLLIN) != 0, "readable event");
    return count;
}
static int run_mode(int edge_triggered) {
    int pair[2];
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, pair) != 0) die("socketpair");
    int flags = fcntl(pair[0], F_GETFL, 0);
    if (flags < 0 || fcntl(pair[0], F_SETFL, flags | O_NONBLOCK) < 0)
        die("fcntl O_NONBLOCK");
    int ep = epoll_create1(EPOLL_CLOEXEC);
    if (ep < 0) die("epoll_create1");
    struct epoll_event interest = {
        .events = EPOLLIN | (edge_triggered ? EPOLLET : 0),
        .data.fd = pair[0]
    };
    if (epoll_ctl(ep, EPOLL_CTL_ADD, pair[0], &interest) < 0) die("epoll_ctl");
    send_exact(pair[1], "ABCDE", 5);
    const int first = wait_events(ep, 1000);
    check(first == 1, "first read-ready event");
    char buf[16];
    ssize_t n;
    do { n = read(pair[0], buf, 2); } while (n == -1 && errno == EINTR);
    check(n == 2 && memcmp(buf, "AB", 2) == 0, "partial read of AB");
    /* Three unread bytes remain: LT fires again; ET does not signal a new edge. */
    const int after_partial = wait_events(ep, 0);
    check(after_partial == (edge_triggered ? 0 : 1), "LT/ET after partial read");
    int drained = 0;
    for (;;) {
        n = read(pair[0], buf, sizeof(buf));
        if (n > 0) { drained += (int)n; continue; }
        if (n == -1 && errno == EINTR) continue;
        check(n == -1 && (errno == EAGAIN || errno == EWOULDBLOCK),
              "drain must terminate at EAGAIN, not a blocking read");
        break;
    }
    check(drained == 3, "three bytes remain after reading AB");
    send_exact(pair[1], "Z", 1);
    const int after_new = wait_events(ep, 1000);
    check(after_new == 1, "fresh write must notify");
    do { n = read(pair[0], buf, sizeof(buf)); } while (n == -1 && errno == EINTR);
    check(n == 1 && buf[0] == 'Z', "fresh byte must be readable");
    printf("%s first=%d after_partial=%d after_new=%d unread_before_drain=%d\n",
           edge_triggered ? "ET" : "LT", first, after_partial, after_new, drained);
    if (close(ep) || close(pair[0]) || close(pair[1])) die("close");
    return 0;
}
int main(void) {
    if (run_mode(0) != 0 || run_mode(1) != 0) return 1;
    return 0;
}
