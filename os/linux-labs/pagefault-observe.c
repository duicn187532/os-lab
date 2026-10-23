/* Linux anonymous memory first-touch: observe minor page faults without swap.
 * Requires Linux/WSL2, cc -std=c11 -Wall -Wextra -Werror.
 * This experiment does NOT cause swapping or prove thrashing. */
#define _GNU_SOURCE
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <unistd.h>
enum { PAGE_COUNT = 256 };
static struct rusage usage(void) {
    struct rusage r;
    if (getrusage(RUSAGE_SELF, &r) != 0) { perror("getrusage"); exit(1); }
    return r;
}
int main(void) {
    const long bytes_per_page = sysconf(_SC_PAGESIZE);
    if (bytes_per_page <= 0) { perror("sysconf"); return 1; }
    const size_t length = (size_t)bytes_per_page * PAGE_COUNT;
    volatile unsigned char *const data = mmap(NULL, length, PROT_READ|PROT_WRITE,
        MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    if (data == MAP_FAILED) { perror("mmap"); return 1; }
#ifdef MADV_NOHUGEPAGE
    /* Best effort: reduce transparent huge-page variation for this model. */
    (void)madvise((void *)data, length, MADV_NOHUGEPAGE);
#endif
    const struct rusage before = usage();
    unsigned long first_checksum = 0, second_checksum = 0;
    for (size_t i = 0; i < PAGE_COUNT; i++) {
        data[i * (size_t)bytes_per_page] = (unsigned char)(i + 1);
        first_checksum += data[i * (size_t)bytes_per_page];
    }
    const struct rusage after_first = usage();
    for (size_t i = 0; i < PAGE_COUNT; i++)
        second_checksum += data[i * (size_t)bytes_per_page];
    const struct rusage after_second = usage();
    const long minor_first = after_first.ru_minflt - before.ru_minflt;
    const long minor_second = after_second.ru_minflt - after_first.ru_minflt;
    const long major_first = after_first.ru_majflt - before.ru_majflt;
    const long major_second = after_second.ru_majflt - after_first.ru_majflt;
    if (first_checksum != second_checksum || first_checksum != 32640UL ||
        minor_first <= 0 || minor_second < 0 || major_first < 0 || major_second < 0) {
        fprintf(stderr, "invariant failed: checksums=%lu/%lu faults=%ld/%ld\n",
            first_checksum, second_checksum, minor_first, minor_second);
        (void)munmap((void *)data, length);
        return 1;
    }
    printf("pages=%d page_bytes=%ld checksum=%lu minor_first=%ld minor_second=%ld "
           "major_first=%ld major_second=%ld\n", PAGE_COUNT, bytes_per_page,
           second_checksum, minor_first, minor_second, major_first, major_second);
    if (munmap((void *)data, length) != 0) { perror("munmap"); return 1; }
    return 0;
}
