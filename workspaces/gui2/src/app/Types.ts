import {IPacket as IPacketBase, ICommand as ICommandBase} from '@puth/core/src/Types';
import ContextStore from "./store/ContextStore.tsx";

/**
 * Override core types because we replace IContext with ContextStore after receiving a packet
 */
export type IPacket = IPacketBase & {
    context: ContextStore,
};
export type ICommand = ICommandBase & {
    context: ContextStore,
};
