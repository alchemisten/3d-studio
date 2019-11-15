export enum MaterialEnum {
    FOO,
    BAR,
    BAZ
}

export interface Peter {
    meter: boolean;
}

export interface MaterialProperties {
    bar: MaterialEnum[];
    skrrt: string[];
    bob: { [id: string]: number };
    ss: Peter;
}   