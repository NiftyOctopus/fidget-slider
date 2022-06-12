const walls = [
    {
        y: 0,
        k: 0.005,
        c: 0.2,
        triggers: {
            latch:   [{ y: 15, v: -1 }],
            release: [{ y: 15, v:  1 }]
        }
    },
    {
        y: -1,
        k: 0.002,
        c: 0.075,
        triggers: {
            latch:   [{ y: 0, v:  1 }],
            release: [{ y: 0, v: -1 }]
        }
    }
]

export default { walls }