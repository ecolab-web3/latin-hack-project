import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { RecyclingCredits_LatinHack } from "../typechain-types";

// Describe el conjunto de pruebas para el contrato RecyclingCredits_LatinHack refactorizado a ERC-1155
describe("RecyclingCredits_LatinHack (ERC-1155)", function () {
  
  let creditContract: RecyclingCredits_LatinHack;
  let owner: HardhatEthersSigner;
  let certifier: HardhatEthersSigner;
  let cooperative: HardhatEthersSigner;
  let company: HardhatEthersSigner;

  const proofHash = "0x123456789012345678901234567890123456789012345678901234567890abcd";
  const FIRST_CREDIT_ID = 0; // El primer lote certificado tendrá el ID 0

  beforeEach(async function () {
    [owner, certifier, cooperative, company] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RecyclingCredits_LatinHack");
    creditContract = await Factory.deploy(owner.address); 
    await creditContract.waitForDeployment();
  });

  describe("Despliegue y Gestión de Roles", function () {
    it("Debería establecer el propietario correcto", async function () {
      expect(await creditContract.owner()).to.equal(owner.address);
    });

    it("Debería otorgar el rol de certificador al propietario inicial", async function () {
      expect(await creditContract.isCertifier(owner.address)).to.be.true;
    });

    it("Debería permitir al propietario otorgar y revocar el rol de certificador", async function () {
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
      expect(await creditContract.isCertifier(certifier.address)).to.be.true;
      
      await creditContract.connect(owner).revokeCertifierRole(certifier.address);
      expect(await creditContract.isCertifier(certifier.address)).to.be.false;
    });

    it("Debería impedir que no propietarios gestionen roles", async function () {
      await expect(
        creditContract.connect(certifier).grantCertifierRole(company.address)
      ).to.be.revertedWith("Caller is not the owner"); 
    });

    it("Debería impedir que no propietarios revoquen roles", async function () {      
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
      await expect(
        creditContract.connect(company).revokeCertifierRole(certifier.address)
      ).to.be.revertedWith("Caller is not the owner");
    });
  });

  describe("certifyAndMintBatch (Acuñación)", function () {
    beforeEach(async function () {
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
    });

    it("Debería crear un nuevo tipo de token (ID) y acuñar la cantidad correcta", async function () {
      const amount = 1000;
      await expect(
        creditContract.connect(certifier).certifyAndMintBatch(cooperative.address, "Plastico PET", amount, "Coop-SP", proofHash)
      ).to.emit(creditContract, "CreditBatchCertified")
       .withArgs(FIRST_CREDIT_ID, cooperative.address, "Plastico PET", amount, proofHash);
      
      expect(await creditContract.balanceOf(cooperative.address, FIRST_CREDIT_ID)).to.equal(amount);
      const details = await creditContract.creditDetails(FIRST_CREDIT_ID);
      expect(details.materialType).to.equal("Plastico PET");
      expect(details.totalWeightKg).to.equal(amount);
    });

    it("Debería impedir que un no certificador acuñe créditos", async function () {
      await expect(
        creditContract.connect(company).certifyAndMintBatch(cooperative.address, "Plastico PET", 1000, "Coop-SP", proofHash)
      ).to.be.revertedWith("Caller is not a certifier"); 
    });
    
    it("Debería fallar si se intenta acuñar créditos para la dirección cero", async function () {      
      const amount = 1000;
      await expect(
        creditContract.connect(certifier).certifyAndMintBatch(ethers.ZeroAddress, "Plastico PET", amount, "Coop-SP", proofHash)
      ).to.be.revertedWith("ERC1155: no se puede acunar a la direccion cero");
    });
  });

  describe("retireCredits (Quema)", function () {
    const totalAmount = 500;
    beforeEach(async function () {
      await creditContract.connect(owner).certifyAndMintBatch(company.address, "Carton", totalAmount, "Coop-RJ", proofHash);
    });

    it("Debería permitir al dueño quemar una porción de sus créditos", async function () {
      const burnAmount = 200;
      await expect(creditContract.connect(company).retireCredits(FIRST_CREDIT_ID, burnAmount))
        .to.emit(creditContract, "CreditsRetired")
        .withArgs(FIRST_CREDIT_ID, company.address, burnAmount);
      
      const remainingBalance = totalAmount - burnAmount;
      expect(await creditContract.balanceOf(company.address, FIRST_CREDIT_ID)).to.equal(remainingBalance);
    });
    
    it("Debería fallar si se intenta quemar más créditos de los que se poseen", async function () {      
      const totalAmount = 500;
      const burnAmount = totalAmount + 1;
      await creditContract.connect(owner).certifyAndMintBatch(company.address, "Carton", totalAmount, "Coop-RJ", proofHash);
      await expect(
        creditContract.connect(company).retireCredits(FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWith("ERC1155: balance insuficiente para quemar");
    });
  });

  describe("Funcionalidad ERC-1155 (Transferencia y Aprobación)", function () {
    const totalAmount = 1000;
    beforeEach(async function () {
      await creditContract.connect(owner).certifyAndMintBatch(cooperative.address, "Vidrio", totalAmount, "Coop-MG", proofHash);
    });

    it("Debería permitir la transferencia de una porción de créditos", async function () {
      const transferAmount = 300;
      await creditContract.connect(cooperative).safeTransferFrom(cooperative.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x");
      
      const coopBalance = totalAmount - transferAmount;
      expect(await creditContract.balanceOf(cooperative.address, FIRST_CREDIT_ID)).to.equal(coopBalance);
      expect(await creditContract.balanceOf(company.address, FIRST_CREDIT_ID)).to.equal(transferAmount);
    });

    it("Debería permitir a un operador aprobado transferir créditos", async function () {
      const transferAmount = 400;
      await creditContract.connect(cooperative).setApprovalForAll(owner.address, true);
      
      await creditContract.connect(owner).safeTransferFrom(cooperative.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x");
      
      const coopBalance = totalAmount - transferAmount;
      expect(await creditContract.balanceOf(cooperative.address, FIRST_CREDIT_ID)).to.equal(coopBalance);
      expect(await creditContract.balanceOf(company.address, FIRST_CREDIT_ID)).to.equal(transferAmount);
    });

    it("Debería fallar si se intenta transferir más créditos de los que se poseen", async function () {
      const transferAmount = totalAmount + 1;
      await expect(
        creditContract.connect(cooperative).safeTransferFrom(cooperative.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWith("ERC1155: balance insuficiente");
    });

    it("Debería fallar al consultar el balance de la dirección cero", async function () {      
      await expect(
        creditContract.balanceOf(ethers.ZeroAddress, FIRST_CREDIT_ID)
      ).to.be.revertedWith("ERC1155: direccion invalida");
    });

    it("Debería impedir que una cuenta no autorizada transfiera créditos", async function () {      
      const transferAmount = 100;
      await expect(
        creditContract.connect(company).safeTransferFrom(cooperative.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWith("ERC1155: no autorizado");
    });

    it("Debería impedir la transferencia a la dirección cero", async function () {      
      const transferAmount = 100;
      await expect(
        creditContract.connect(cooperative).safeTransferFrom(cooperative.address, ethers.ZeroAddress, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWith("ERC1155: no se puede transferir a la direccion cero");
    });

    it("Debería impedir que una cuenta queme tokens de otra cuenta", async function () {      
      const burnAmount = 100;
      // La 'company' intenta quemar tokens que pertenecen a la 'cooperative'
      await expect(
        creditContract.connect(company).burn(cooperative.address, FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWith("ERC1155: solo el propietario puede quemar sus tokens");
    });
  });
});