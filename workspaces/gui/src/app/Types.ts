import {IPacket as IPacketBase, ICommand as ICommandBase} from '@puth/core';
import ContextStore from "@/app/store/ContextStore";

/**
 * Override core types because we replace IContext with ContextStore after receiving a packet
 */
export type IPacket = IPacketBase & {
    context: ContextStore,
};
export type ICommand = ICommandBase & {
    context: ContextStore,
};
