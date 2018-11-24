export type GenericFunction<T = any, U = any> = (...args: T[]) => U;

export type NodeCallback = (err: Error | null, result?: any) => any;

export type ObjectMap<T> = {
	[key: string]: T;
	[key: number]: T;
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Primitive = undefined | null | boolean | number | string | symbol;

export type ValueOf<T> = T[keyof T];
