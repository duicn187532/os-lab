/* Real Linux fork/exec/waitpid lab. No timing-dependent ordering assertions.
 * Usage: ./process-exec-demo [--missing]
 * Exit status 7 is a successful exec of /bin/sh that calls exit(7).
 * In --missing mode exec fails; the child returns status 127. */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char **argv) {
    const int missing = argc == 2 && strcmp(argv[1], "--missing") == 0;
    if (argc > 2 || (argc == 2 && !missing)) {
        fprintf(stderr, "usage: %s [--missing]\n", argv[0]);
        return 64;
    }
    pid_t child = fork();
    if (child < 0) { perror("fork"); return 1; }
    if (child == 0) {
        if (missing)
            execl("/os-lab-intentionally-nonexistent", "missing", (char *)NULL);
        else
            execl("/bin/sh", "sh", "-c", "exit 7", (char *)NULL);
        /* Only reached when exec fails. Never call stdio exit() in the child. */
        int e = errno;
        fprintf(stderr, "child: exec failed (%d)\n", e);
        _exit(127);
    }
    int status = 0;
    pid_t waited;
    do { waited = waitpid(child, &status, 0); }
    while (waited == -1 && errno == EINTR);
    if (waited < 0) { perror("waitpid"); return 1; }
    if (waited != child) { fputs("wrong child PID\n", stderr); return 1; }
    if (WIFEXITED(status)) {
        printf("child-exit=%d\n", WEXITSTATUS(status));
        return WEXITSTATUS(status) == (missing ? 127 : 7) ? 0 : 1;
    }
    if (WIFSIGNALED(status)) {
        printf("child-signal=%d\n", WTERMSIG(status));
        return 1;
    }
    fputs("unexpected wait status\n", stderr);
    return 1;
}
