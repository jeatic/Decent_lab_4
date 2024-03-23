//user.ts
import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, BASE_USER_PORT, REGISTRY_PORT} from "../config";
import {rsaEncrypt, symEncrypt, exportSymKey, createRandomSymmetricKey, importSymKey} from '../crypto';
import axios from "axios";
import { Node } from '../registry/registry';

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

var lastReceivedDecryptedMessage : string | null = null;
var lastSendDecryptedMessage : string | null = null;
export type circuitNode={
    nodeId:number;
  pubKey:string;
}
var lastCircuit : circuitNode[] | null = null;

export async function user(userId: number) {
    const _user = express();
    _user.use(express.json());
    _user.use(bodyParser.json());

    _user.get("/status", (req, res) => {
        res.status(200).send("live");
    });


    _user.get("/getLastReceivedMessage", (req, res) => {
        res.status(200).json({result: lastReceivedDecryptedMessage})
    });

    

    
    _user.get("/getLastSentMessage", (req, res) => {  //send last message

        res.status(200).json({result: lastSendDecryptedMessage})
    });

    _user.post("/message", (req, res) => {
        const {message} = req.body;
        lastReceivedDecryptedMessage = message;
        res.status(200).send("success");
    });

    _user.get("/getLastCircuit", (req, res) => {
        if (lastCircuit) {
            const nodeIds = lastCircuit.map(node => node.nodeId);
            res.status(200).json({result: nodeIds});
        } else {
            res.status(404).send("No circuit found");
        }
    });

    _user.post('/sendMessage', async (req, res) => {
        const { message, destinationUserId } = req.body;
        lastSendDecryptedMessage = message;

        const response = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
        const nodes = response.data.nodes as Node[];

        const circuit: circuitNode[] = [];
        while (circuit.length < 3) {
            const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
            if (!circuit.includes(randomNode)) {
                circuit.push(randomNode);
            }
        }
        let destination = String(BASE_USER_PORT + destinationUserId).padStart(10, '0');
        let encryptedMessage=message;
        for (const node of circuit) {

            const symKeyCrypto = await createRandomSymmetricKey();


            const symKeyString = await exportSymKey(symKeyCrypto);

            const symKey = await importSymKey(symKeyString);

            
            
            const tempMessage = await symEncrypt(symKey, destination + encryptedMessage); //encrypt
            destination = String(BASE_ONION_ROUTER_PORT + node.nodeId).padStart(10, '0');
            const encryptedSymKey = await rsaEncrypt(symKeyString, node.pubKey);
            encryptedMessage = encryptedSymKey + tempMessage;
        }
        circuit.reverse()
        lastCircuit = circuit;
        const entryNode = circuit[0];
        if(encryptedMessage!=null) {
            await axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + entryNode.nodeId}/message`, {
                message: encryptedMessage,
            });
            lastSendDecryptedMessage = message;
            res.status(200).send('Message sent');
        }
    });

    const server = _user.listen(BASE_USER_PORT + userId, () => {
        console.log(
            `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
        );
    });

    return server;

}