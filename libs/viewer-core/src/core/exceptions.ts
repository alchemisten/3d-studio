export class FeatureAlreadyRegisteredError extends Error {
    constructor(message: string) { super(message); }
}

export class FeatureNotRegisteredError extends Error {
    constructor(message: string) { super(message); }
}

export class MissingAnimationError extends Error {
    constructor(message: string) { super(message); }
}

export class MissingDIContainerError extends Error {
    constructor(message: string) { super(message); }
}

export class MissingLightScenarioError extends Error {
    constructor(message: string) { super(message); }
}

export class MissingMixerError extends Error {
    constructor(message: string) { super(message); }
}

export class ObjectHasNoAnimationsError extends Error {
    constructor(message: string) { super(message); }
}

export class UnknowLightTypeError extends Error {
    constructor(message: string) { super(message); }
}

