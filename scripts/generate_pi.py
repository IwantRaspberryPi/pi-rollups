"""Generate decimal digits of pi with Chudnovsky binary splitting (stdlib only)."""
from math import isqrt
from pathlib import Path
import hashlib
import sys

if hasattr(sys, 'set_int_max_str_digits'):
    sys.set_int_max_str_digits(0)

def split(a, b):
    if b - a == 1:
        if a == 0:
            return 1, 1, 13591409
        p = (6*a-5) * (2*a-1) * (6*a-1)
        q = a*a*a * 10939058860032000
        t = p * (13591409 + 545140134*a)
        return p, q, -t if a % 2 else t
    m = (a+b)//2
    p1, q1, t1 = split(a, m)
    p2, q2, t2 = split(m, b)
    return p1*p2, q1*q2, t1*q2 + p1*t2

def digits(count):
    precision = count + 30
    _, q, t = split(0, precision//14 + 2)
    scale = 10**precision
    pi = q * 426880 * isqrt(10005 * scale * scale) // t
    return str(pi)[1:count+1]

if __name__ == '__main__':
    target = Path(__file__).resolve().parents[1] / 'data'
    target.mkdir(exist_ok=True)
    data = digits(1_000_010).encode('ascii')
    (target / 'pi.txt').write_bytes(data)
    (target / 'pi.sha256').write_text(hashlib.sha256(data).hexdigest() + '\n', encoding='ascii')
    print(f'Generated {len(data):,} decimal digits; SHA-256 {hashlib.sha256(data).hexdigest()}')
