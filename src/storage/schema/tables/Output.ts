import { Base64String, DescriptionString5to50Bytes, PubKeyHex } from '@bsv/sdk'
import { OutputBasket, OutputTag } from "."
import { sdk } from "../../../index.client"

export interface Output extends sdk.EntityTimeStamp {
   created_at: Date
   updated_at: Date
   outputId: number
   userId: number
   transactionId: number
   basketId?: number
   spendable: boolean
   change: boolean
   outputDescription: DescriptionString5to50Bytes
   vout: number
   satoshis: number
   providedBy: sdk.StorageProvidedBy
   purpose: string
   type: string
   txid?: string
   senderIdentityKey?: PubKeyHex
   derivationPrefix?: Base64String
   derivationSuffix?: Base64String
   customInstructions?: string
   spentBy?: number
   sequenceNumber?: number
   spendingDescription?: string
   scriptLength?: number
   scriptOffset?: number
   lockingScript?: number[]
}

export interface OutputX extends Output {
   basket?: OutputBasket
   tags?: OutputTag[]
}

export const outputColumnsWithoutLockingScript = [
   'created_at',
   'updated_at',
   'outputId',
   'userId',
   'transactionId',
   'basketId',
   'spendable',
   'change',
   'vout',
   'satoshis',
   'providedBy',
   'purpose',
   'type',
   'outputDescription',
   'txid',
   'senderIdentityKey',
   'derivationPrefix',
   'derivationSuffix',
   'customInstructions',
   'spentBy',
   'sequenceNumber',
   'spendingDescription',
   'scriptLength',
   'scriptOffset',
   //'lockingScript',
]