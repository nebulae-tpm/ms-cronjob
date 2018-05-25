const Rx = require('rxjs');
const cronjobEventConsumer = require('../../domain/CronjobEventConsumer')();
const eventSourcing = require('../../tools/EventSourcing')();

/**
 * Singleton instance
 */
let instance;

class EventStoreService {

    constructor() {
        this.functionMap = this.generateFunctionMap();
        this.subscriptions = [];
    }


    /**
     * Starts listening to the EventStore
     * Returns observable that resolves to each subscribe agregate/event
     *    emit value: { aggregateType, eventType, handlerName}
     */
    start$() {
        //default error handler
        const onErrorHandler = (error) => {
            console.error('Error handling  EventStore incoming event', error);
            proccess.exit(1);
        };
        //default onComplete handler
        const onCompleteHandler = () => {
            () => console.log('EventStore incoming event subscription completed');
        }
        return Rx.Observable.from([
            { aggregateType: 'Cronjob', eventType: 'CronjobCreated', onErrorHandler, onCompleteHandler },
            { aggregateType: 'Cronjob', eventType: 'CronjobUpdated', onErrorHandler, onCompleteHandler },            
            { aggregateType: 'Cronjob', eventType: 'CronjobRemoved', onErrorHandler, onCompleteHandler }            
        ]).map(params => { 
            return this.subscribeEventHandler(params)
        });
    }

    /**
     * Stops listening to the Event store
     * Returns observable that resolves to each unsubscribed subscription as string     
     */
    stop$() {
        Rx.Observable.from(this.subscriptions)
            .map(subscription => {
                subscription.subscription.unsubscribe();
                return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
            })
    }

    /**
     * Create a subscrition to the event store and returns the subscription info     
     * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
     * @return { aggregateType, eventType, handlerName  }
     */
    subscribeEventHandler({ aggregateType, eventType, onErrorHandler, onCompleteHandler }) {
        const handler = this.functionMap[eventType];
        const subscription = eventSourcing.eventStore.getEventListener$(aggregateType,false)  
            .filter(evt => evt.et === eventType)
            .mergeMap(evt => handler.fn.call(handler.obj, evt))
            .subscribe(
                (evt) => console.log(`EventStoreService: ${eventType} process: ${evt}`),
                onErrorHandler,
                onCompleteHandler
            );
        this.subscriptions.push({ aggregateType, eventType, handlerName: handler.fn.name, subscription });
        return { aggregateType, eventType, handlerName: `${handler.obj.name}.${handler.fn.name}` };
    }

    /**
     * Generates a map that assocs each Event with its handler
     */
    generateFunctionMap() {
        return {
            'CronjobCreated': { fn: cronjobEventConsumer.handleCronjobCreated$, obj: cronjobEventConsumer },
            'CronjobUpdated': { fn: cronjobEventConsumer.handleCronjobUpdated$, obj: cronjobEventConsumer },
            'CronjobRemoved': { fn: cronjobEventConsumer.handleCronjobRemoved$, obj: cronjobEventConsumer },
        };
    }

}



module.exports = () => {
    if (!instance) {
        instance = new EventStoreService();
        console.log('EventStoreService Singleton created');
    }
    return instance;
};