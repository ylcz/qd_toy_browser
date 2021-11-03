
export class Dispatcher {
    constructor(element) {
        this.element = element;
    }
    dispatch(type, properties) {
        let event = new Event(type);
        console.log(event);
        for (let name in properties) {
            event[name] = properties[name];
        }
        this.element.dispatchEvent(event);
    }
}

//listen => recognize => dispatch

// new Listener(new Recognizer(dispatch));

export class Listener {
    constructor(element, recognizer) {
        let isListeningMouse = false;

        let contexts = new Map();

        element.addEventListener("mousedown", event => {

            let context = Object.create(null);
            contexts.set("mouse" + (1 << event.button), context);
            console.log("start", (1 << event.button));

            recognizer.start(event, context);

            let mousemove = event => {
                // console.log(event.clientX, event.clientY);
                let button = 1;
                while (button <= event.buttons) {
                    if (button & event.buttons) {
                        //order of buttons & button property is not same
                        let key;
                        if (button === 2)
                            key = 4;
                        else if (button === 4)
                            key = 2;
                        else
                            key = button;
                        let context = contexts.get("mouse" + key);
                        console.log("move", (key));
                        recognizer.move(event, context);
                    }
                    button = button << 1;
                }

            }
            let mouseup = event => {
                let context = contexts.get("mouse" + (1 << event.button));
                recognizer.end(event, context);
                contexts.delete("mouse" + (1 << event.button));
                if (event.buttons === 0) {
                    document.removeEventListener("mousemove", mousemove);
                    document.removeEventListener("mouseup", mouseup);
                    isListeningMouse = false;
                }
            }
            if (!isListeningMouse) {
                document.addEventListener("mousemove", mousemove);
                document.addEventListener("mouseup", mouseup);
                isListeningMouse = true;
            }
        });

        element.addEventListener("touchstart", ev => {
            // console.log(ev.changedTouches);
            for (let touch of ev.changedTouches) {
                // console.log("start", touch.clientX, touch.clientY);
                let context = Object.create(null);
                contexts.set(touch.identifier, context);
                recognizer.start(touch, context);
            }
        });

        element.addEventListener("touchmove", ev => {
            // console.log(ev.changedTouches);
            for (let touch of ev.changedTouches) {
                // console.log("move", touch.clientX, touch.clientY);
                let context = contexts.get(touch.identifier);
                recognizer.move(touch, context);
            }
        });

        element.addEventListener("touchend", ev => {
            // console.log(ev.changedTouches);
            for (let touch of ev.changedTouches) {
                // console.log("end", touch.clientX, touch.clientY);
                let context = contexts.get(touch.identifier);
                recognizer.end(touch, context);
                contexts.delete(touch.identifier);
            }
        });

        element.addEventListener("touchcancel", ev => {
            // console.log(ev.changedTouches);
            for (let touch of ev.changedTouches) {
                // console.log("cancel", touch.clientX, touch.clientY);
                let context = contexts.get(touch.identifier);
                recognizer.cancel(touch, context);
                contexts.delete(touch.identifier);
            }
        });
    }
}

export class Recognizer {
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
    }
    start(point, context) {
        // console.log("start", point.clientX, point.clientY);
        context.startX = point.clientX, context.startY = point.clientY;
        context.points = [{
            t: Date.now(),
            x: point.clientX,
            y: point.clientY
        }];

        context.isTap = true;
        context.isPan = false;
        context.isPress = false;

        context.handler = setTimeout(() => {
            context.isTap = false;
            context.isPan = false;
            context.isPress = true;
            context.handler = null;
            // console.log("press");
            this.dispatcher.dispatch("press", {});
        }, 500);
    }

    move(point, context) {
        let dx = point.clientX - context.startX, dy = point.clientY - context.startY;

        if (!context.isPan && dx ** 2 + dy ** 2 > 100) {
            context.isTap = false;
            context.isPan = true;
            context.isPress = false;
            context.isVertical = Math.abs(dx) < Math.abs(dy);//用来分辨上划还是下划
            // console.log("panstart");
            this.dispatcher.dispatch("panstart", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical
            });
            clearTimeout(context.handler);
        }

        if (context.isPan) {
            // console.log(dx, dy);
            // console.log("pan");
            this.dispatcher.dispatch("pan", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical
            });
        }

        context.points = context.points.filter(point => Date.now() - point.t < 500);

        context.points.push({
            t: Date.now(),
            x: point.clientX,
            y: point.clientY
        });
        // console.log("move", point.clientX, point.clientY);
    }

    end(point, context) {
        // console.log("end", point.clientX, point.clientY);
        if (context.isTap) {
            // console.log("tap");
            this.dispatcher.dispatch("tap", {});
            clearTimeout(context.handler);
        }

        if (context.isPress) {
            // console.log("pressend");
            this.dispatcher.dispatch("pressend", {});
        }

        context.points = context.points.filter(point => Date.now() - point.t < 500);

        let d, v;
        if (!context.points.length) {
            v = 0;
        } else {
            d = Math.sqrt((point.clientX - context.points[0].x) ** 2 +
                (point.clientY - context.points[0].y) ** 2);
            v = d / (Date.now() - context.points[0].t);
        }
        // console.log(v);
        if (v > 1.5) {
            // console.log("flick");
            this.dispatcher.dispatch("flick", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical,
                isFlick: context.isFlick,
                velocity: v
            });
            context.isFlick = true;
        } else {
            context.isFlick = false;
        }

        if (context.isPan) {
            // console.log("panend");
            this.dispatcher.dispatch("panend", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical,
                isFlick: context.isFlick
            });
        }
    }

    cancel(point, context) {
        clearTimeout(context.handler);
        // console.log("cancel", point.clientX, point.clientY);
        this.dispatcher.dispatch("cancel", {});
    }
}

export function enableGesture(element) {
    new Listener(element, new Recognizer(new Dispatcher(element)));
}