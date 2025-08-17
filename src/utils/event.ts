/** 型付きの EventTarget */
export interface TypedEventTarget<EventMap> extends EventTarget {
    addEventListener<K extends keyof EventMap>(
        type: K,
        listener: (this: TypedEventTarget<EventMap>, ev: EventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof EventMap>(
        type: K,
        listener: (this: TypedEventTarget<EventMap>, ev: EventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
    dispatchEvent(event: Event): boolean;
}
