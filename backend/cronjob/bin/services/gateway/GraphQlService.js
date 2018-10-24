'use strict';

const cronjobs = require('../../domain/Cronjobs')();
const broker = require('../../tools/broker/BrokerFactory')();
const Rx = require('rxjs');
const jsonwebtoken = require('jsonwebtoken');
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

let instance;

class GraphQlService {
  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  start$() {
     //default on error handler
     const onErrorHandler = (error) => {
      console.error("Error handling  GraphQl incoming event", error);
      process.exit(1);
    };

    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("GraphQlService incoming event subscription completed");
    };
    console.log("GraphQl Service starting ...");

    return Rx.Observable.from(this.getSubscriptionDescriptors())
    .map(params => this.subscribeEventHandler({...params, onErrorHandler, onCompleteHandler}));    
  }

  
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType])
      .mergeMap(message => this.verifyRequest$(message))
      .mergeMap(request => ( request.failedValidations.length > 0)
        ? Rx.Observable.of(request.errorResponse)
        : Rx.Observable.of(request)
          //ROUTE MESSAGE TO RESOLVER
          .mergeMap(({ authToken, message }) =>
            handler.fn
              .call(handler.obj, message.data, authToken)
              .map(response => ({ response, correlationId: message.id, replyTo: message.attributes.replyTo }))
          )
      )    
      .mergeMap(msg => this.sendResponseBack$(msg))
      .subscribe(
        msg => { /* console.log(`GraphQlService: ${messageType} process: ${msg}`); */ },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

  stop$() {
    return Rx.Observable.from(this.subscriptions).map(subscription => {
      subscription.subscription.unsubscribe();
      return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
    });
  }

    /**
   * send response back if neccesary
   * @param {any} msg Object with data necessary  to send response
   */
  sendResponseBack$(msg) {
    return Rx.Observable.of(msg)
      .mergeMap(({ response, correlationId, replyTo }) =>
        replyTo
          ? broker.send$( replyTo, "gateway.graphql.Query.response", response,  { correlationId } )
          : Rx.Observable.of(undefined)
      )
  }

  /**
   * Verify the message if the request is valid.
   * @param {any} request request message
   * @returns { Rx.Observable< []{request: any, failedValidations: [] }>}  Observable object that containg the original request and the failed validations
   */
  verifyRequest$(request) {
    return Rx.Observable.of(request)
      //decode and verify the jwt token
      .mergeMap(message =>
        Rx.Observable.of(message)
          .map(message => ({ authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey), message, failedValidations: [] }))
          .catch(err =>
            cronjobs.errorHandler$(err)
              .map(response => ({
                errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                failedValidations: ['JWT']
              }
              ))
          )
      )
  }


  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////


  /**
   * @returns {Array<{aggregateType:string, messageType:string }>} an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    return [
      {
        aggregateType: "Cronjob",
        messageType: "gateway.graphql.query.getCronjobDetail"
      },
      {
        aggregateType: "Cronjob",
        messageType:
          "gateway.graphql.query.getCronjobs"
      },
      {
        aggregateType: "Cronjob",
        messageType:
          "gateway.graphql.query.getCronjobTableSize"
      },
      {
        aggregateType: "Cronjob",
        messageType:
          "gateway.graphql.mutation.executeCronjob"
      },
      {
        aggregateType: "Cronjob",
        messageType: "gateway.graphql.mutation.persistCronjob"
      },
      {
        aggregateType: "Cronjob",
        messageType: "gateway.graphql.mutation.updateCronjob"
      },
      {
        aggregateType: "Cronjob",
        messageType: "gateway.graphql.mutation.removeCronjob"
      }
    ];
  }

  /**
   * @returns {any} a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {
    return {
      'gateway.graphql.query.getCronjobDetail': {
        fn: cronjobs.getCronjobDetail,
        obj: cronjobs
      },
      'gateway.graphql.query.getCronjobs':{
        fn: cronjobs.getCronjobs,
        obj: cronjobs
      },
      'gateway.graphql.query.getCronjobTableSize': {
        fn: cronjobs.getCronjobTableSize,
        obj: cronjobs
      },        
      'gateway.graphql.mutation.executeCronjob': {
        fn: cronjobs.executeCronjob,
        obj: cronjobs
      },
      'gateway.graphql.mutation.persistCronjob': {
        fn: cronjobs.persistCronjob,
        obj: cronjobs
      },
      'gateway.graphql.mutation.updateCronjob': {
        fn: cronjobs.updateCronjob,
        obj: cronjobs
      },
      'gateway.graphql.mutation.removeCronjob': {
        fn: cronjobs.removeCronjob,
        obj: cronjobs
      }
    };
  }
}

/**
 * @returns {GraphQlService}
 */
module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log('NEW instance GraphQlService !!');
  }
  return instance;
};
