declare module '@remote-modules/types' {
	export interface ObjectMap<T> {
		[key: string]: T;
		[key: number]: T;
	}
}
