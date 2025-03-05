import { BitailsMerkleProof, convertProofToMerklePath } from "../providers/Bitails"

describe('bitrails tests', () => {
    jest.setTimeout(99999999)

    test('0 verify merkle proof to merkle path', async () => {
       const mp = convertProofToMerklePath(742198, proof1) 
       const root = mp.computeRoot('c32597ddd7d8623d7eb1ddd854ab36541e037dc1f9f0ab7aaf55d3a1e5a17af0')
       expect(root).toBe(proof1.merkleRoot)
    })
})

const proof1: BitailsMerkleProof = {
  "blockhash": "00000000000000001055c413778451e93e4ab0b4ee442900470abe777916da35",
  "branches": [
    {
      "pos": "L",
      "hash": "721de019439047ddf9e12b97bca5cd13fd268f5f98e87a9d3d36ab6ec75bd7b7"
    },
    {
      "pos": "R",
      "hash": "d84f9a2b20d422e752f67825d95898679dde0b27bb6beca93457f931df11e97b"
    },
    {
      "pos": "L",
      "hash": "c4f70a467c21815567e2f8757f1657a131ae7947e31e52d634cacf02e510bad9"
    },
    {
      "pos": "R",
      "hash": "62064a40c521dd7ae90b5e6c80c2b1af5c49255df3371867fc288eace572f0c8"
    },
    {
      "pos": "R",
      "hash": "687704a7494d2de9c05b51a87f28b64dac3bd62210794ab75d572a8d12c5ec91"
    },
    {
      "pos": "R",
      "hash": "0ba088aa95b3124ed707b2934f7bb29cae08db34b5f5c5d1e38de5a61f8ff054"
    },
    {
      "pos": "R",
      "hash": "bfe1a2e4e538d9e2116f4dcbab8a0772e8add62912cf9c1fc4265d47a404187c"
    },
    {
      "pos": "R",
      "hash": "9569c0d002e2dcdddd2c2da0ef13c3a8b7fe0acf551da8758d0e1543f296e63d"
    },
    {
      "pos": "R",
      "hash": "a7295ed632878ffed3bfb8546d01b69b0706817959dd6a3056c6e86092ecc18c"
    },
    {
      "pos": "R",
      "hash": "ca0b8b206113a74fcfba0253e7955e0a8b5156b2d12b047b844c3ff34523d041"
    },
    {
      "pos": "R",
      "hash": "9411902fe97e0830742444c5ddd1140bc6d6e8e7704b9bad30de2bf41c4632f9"
    },
    {
      "pos": "R",
      "hash": "22db03d45958fe89b5988c88b7765c8e2aad92526cd620f3d2a8f912e265b1d5"
    },
    {
      "pos": "R",
      "hash": "42ab5991b070de02dd215ca953b50add469f928414b17d9e244d0c9321817a7c"
    },
    {
      "pos": "R",
      "hash": "2686fa8d0b647a1b2283a610ffabed6c6c9f5447b9fc21c640974bd47b0a08b2"
    }
  ],
  "hash": "c32597ddd7d8623d7eb1ddd854ab36541e037dc1f9f0ab7aaf55d3a1e5a17af0",
  "merkleRoot": "22b294aac4c3f6f4fdae30dc4f46f68f90feb94f03531c32bcf2ce33be5d4cb0"
}