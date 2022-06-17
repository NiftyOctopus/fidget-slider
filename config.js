const walls = [
    {
        y: -150,
        k: 0.005,
        c: 0.2,
        trigger: { dir: 'fwd' }
    },
    {
        y: 200,
        k: 0.005,
        c: 0.2,
        trigger: { dir: 'both', y: 25 }
    },
]

export default { walls }