<p align="center"><img src="/RiverFinance.PNG" align="center" width="400"></p>
 
<p  align="center">Platform for streaming tokens on Solana 🚀</p>

## Motivation

- A stream of payment can be easily used to pay for renting a service (NFT, DAO etc.) or for payment of salary by seconds rather than monthly. This enables real time payment of the service you provide without increased gas price.
 
## Solution
- Users can easily mint a River Token (Streamable Token) for any underlying token. This is handled using Initialize instruction.
- Once initialized user can deposit underlying tokens and get River tokens in return. These tokens are directly deposited into a lending market to generate yield on deposited tokens. 
- On starting a stream a new agreement is added to user accounts. These agreements are really flexible and different kinds of agreements can be implemented. This includes bilateral & pool based agreements. Flow rate can also be constant and follow a curve.
 
## Future Work
- Implement different types of agreements
- Implement integrations with multiple lending markets to generate yield on deposit tokens.
- Create SDKs to make it easy to create new river tokens and start streams.
- Integration with other blockchains to handle deposit of their tokens but start stream on Solana.

## Links
- [Program Repository](https://github.com/ShreyPaharia/RiverFinanceProgram)
- [Slides](https://drive.google.com/file/d/17VPc8cbmftIxU-LNYmyWwgHJc3FogacV/view)