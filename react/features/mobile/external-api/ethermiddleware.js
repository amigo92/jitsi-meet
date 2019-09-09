/* eslint-disable no-case-declarations */
// @flow

import {
    CONFERENCE_FAILED,
    CONFERENCE_JOINED,
    CONFERENCE_LEFT,
    CONFERENCE_WILL_JOIN,
    SET_ROOM,
    getCurrentConference
} from '../../base/conference';
import {
    CONNECTION_DISCONNECTED,
    CONNECTION_FAILED
} from '../../base/connection';
import { setAudioMuted, setVideoMuted } from '../../base/media';

import { MiddlewareRegistry } from '../../base/redux';
import {
    SET_EXTERNAL_API_LISTENER,
    ADD_CALLKIT_URL
} from './actionTypes';
import { externalApiEventEmitter } from './etherfunctions';
import { appNavigate } from '../../app';
import CallKit from '../call-integration/CallKit';

MiddlewareRegistry.register(store => next => action => {
    const result = next(action);
    const { type } = action;
    const { subscriptions, callKitUrl } = store.getState()['features/mobile/external-api'];
    const state = store.getState();
    const conference = getCurrentConference(state);

    switch (type) {
    case CONFERENCE_FAILED:
    case CONFERENCE_LEFT:
    case CONNECTION_DISCONNECTED:
    case CONNECTION_FAILED:
        if (subscriptions) {
            subscriptions.audio.remove();
            subscriptions.video.remove();
            subscriptions.endCall.remove();
            subscriptions.callKitUrl.remove();
            store.dispatch({ type: SET_EXTERNAL_API_LISTENER });
        }
        break;
    case CONFERENCE_WILL_JOIN:
    case CONFERENCE_JOINED:
    case SET_ROOM:
        if (conference && conference.callUUID) {
            CallKit.updateCall(conference.callUUID, {
                handle: callKitUrl || 'https://meet.etherlabs.io'
            });
        }
        if (!subscriptions) {
            const subscription = {
                audio: externalApiEventEmitter().addListener(
                        'toggle-audio',
                        mute => {
                            store.dispatch(
                                setAudioMuted(mute.mute, /* ensureTrack */ true)
                            );
                        }
                ),
                video: externalApiEventEmitter().addListener(
                        'toggle-video',
                        mute => {
                            store.dispatch(
                                setVideoMuted(
                                    mute.mute,
                                    undefined,
                                    /* ensureTrack */ true
                                )
                            );
                        }
                ),
                endCall: externalApiEventEmitter().addListener(
                        'end-call',
                        () => {
                            store.dispatch(appNavigate(undefined));
                        }
                ),
                callKitUrl: externalApiEventEmitter().addListener(
                        'set-call-kit-url',
                        url => {
                            store.dispatch({ type: ADD_CALLKIT_URL,
                                payload: url });
                        }
                )
            };

            store.dispatch({
                type: SET_EXTERNAL_API_LISTENER,
                payload: subscription
            });
        }
        break;
    }

    return result;
});
