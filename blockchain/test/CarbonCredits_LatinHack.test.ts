import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { CarbonCredits_LatinHack } from "../typechain-types";

// Describe el conjunto de pruebas para el contrato CarbonCredits_LatinHack refactorizado a ERC-1155
describe("CarbonCredits_LatinHack (ERC-1155)", function () {
  
  let creditContract: CarbonCredits_LatinHack;
  let owner: HardhatEthersSigner;
  let certifier: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;
  let organization: HardhatEthersSigner;
  let company: HardhatEthersSigner;

  const proofHash = "0x123456789012345678901234567890123456789012345678901234567890abcd";
  const FIRST_CREDIT_ID = 0; // El primer lote certificado tendrá el ID 0

  beforeEach(async function () {
    [owner, certifier, verifier, organization, company] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CarbonCredits_LatinHack");
    creditContract = await Factory.deploy(owner.address); 
    await creditContract.waitForDeployment();
  });

  describe("Despliegue y Gestión de Roles", function () {
    it("Debería establecer el propietario correcto", async function () {
      expect(await creditContract.hasRole(await creditContract.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Debería otorgar el rol de certificador al propietario inicial", async function () {
      expect(await creditContract.hasRole(await creditContract.CERTIFIER_ROLE(), owner.address)).to.be.true;
    });

    it("Debería permitir al propietario otorgar y revocar el rol de certificador", async function () {
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
      expect(await creditContract.hasRole(await creditContract.CERTIFIER_ROLE(), certifier.address)).to.be.true;
      
      await creditContract.connect(owner).revokeCertifierRole(certifier.address);
      expect(await creditContract.hasRole(await creditContract.CERTIFIER_ROLE(), certifier.address)).to.be.false;
    });

    it("Debería permitir al propietario otorgar y revocar el rol de verificador", async function () {
      await creditContract.connect(owner).grantVerifierRole(verifier.address);
      expect(await creditContract.hasRole(await creditContract.VERIFIER_ROLE(), verifier.address)).to.be.true;
      
      await creditContract.connect(owner).revokeVerifierRole(verifier.address);
      expect(await creditContract.hasRole(await creditContract.VERIFIER_ROLE(), verifier.address)).to.be.false;
    });

    it("Debería impedir que no propietarios gestionen roles", async function () {
      await expect(
        creditContract.connect(certifier).grantCertifierRole(company.address)
      ).to.be.revertedWithCustomError(creditContract, "AccessControlUnauthorizedAccount");
    });

    it("Debería impedir que no propietarios revoquen roles", async function () {      
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
      await expect(
        creditContract.connect(company).revokeCertifierRole(certifier.address)
      ).to.be.revertedWithCustomError(creditContract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("certifyAndMintCarbonCredit (Acuñación)", function () {
    beforeEach(async function () {
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
    });

    it("Debería crear un nuevo tipo de token (ID) y acuñar la cantidad correcta", async function () {
      const co2eAmount = 1000;
      await expect(
        creditContract.connect(certifier).certifyAndMintCarbonCredit(
          organization.address, 
          "VCS", 
          co2eAmount, 
          "Amazon Rainforest", 
          proofHash
        )
      ).to.emit(creditContract, "CreditCertified")
       .withArgs(FIRST_CREDIT_ID, organization.address, "VCS", co2eAmount, "Amazon Rainforest", proofHash);
      
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(co2eAmount);
      const details = await creditContract.creditDetails(FIRST_CREDIT_ID);
      expect(details.methodology).to.equal("VCS");
      expect(details.co2eAmount).to.equal(co2eAmount);
    });

    it("Debería impedir que un no certificador acuñe créditos", async function () {
      await expect(
        creditContract.connect(company).certifyAndMintCarbonCredit(
          organization.address, 
          "VCS", 
          1000, 
          "Amazon Rainforest", 
          proofHash
        )
      ).to.be.revertedWithCustomError(creditContract, "AccessControlUnauthorizedAccount");
    });
    
    it("Debería fallar si se intenta acuñar créditos para la dirección cero", async function () {      
      const co2eAmount = 1000;
      await expect(
        creditContract.connect(certifier).certifyAndMintCarbonCredit(
          ethers.ZeroAddress, 
          "VCS", 
          co2eAmount, 
          "Amazon Rainforest", 
          proofHash
        )
      ).to.be.revertedWithCustomError(creditContract, "ERC1155InvalidReceiver");
    });
  });

  describe("retireCarbonCredits (Quema)", function () {
    const totalAmount = 1000;
    beforeEach(async function () {
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
      await creditContract.connect(certifier).certifyAndMintCarbonCredit(
        organization.address, 
        "VCS", 
        totalAmount, 
        "Amazon Rainforest", 
        proofHash
      );
    });

    it("Debería permitir al dueño quemar una porción de sus créditos", async function () {
      const burnAmount = 300;
      await expect(creditContract.connect(organization).retireCredit(FIRST_CREDIT_ID, burnAmount))
        .to.emit(creditContract, "CreditRetired")
        .withArgs(FIRST_CREDIT_ID, organization.address, burnAmount);
      
      const remainingBalance = totalAmount - burnAmount;
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(remainingBalance);
    });
    
    it("Debería fallar si se intenta quemar más créditos de los que se poseen", async function () {      
      const burnAmount = totalAmount + 1;
      await expect(
        creditContract.connect(organization).retireCredit(FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWithCustomError(creditContract, "ERC1155InsufficientBalance");
    });
  });

  describe("Funcionalidad ERC-1155 (Transferencia y Aprobación)", function () {
    const totalAmount = 1000;
    beforeEach(async function () {
      await creditContract.connect(owner).grantCertifierRole(certifier.address);
      await creditContract.connect(certifier).certifyAndMintCarbonCredit(
        organization.address, 
        "VCS", 
        totalAmount, 
        "Amazon Rainforest", 
        proofHash
      );
    });

    it("Debería permitir la transferencia de una porción de créditos", async function () {
      const transferAmount = 300;
      await creditContract.connect(organization).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x");
      
      const orgBalance = totalAmount - transferAmount;
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(orgBalance);
      expect(await creditContract.balanceOf(company.address, FIRST_CREDIT_ID)).to.equal(transferAmount);
    });

    it("Debería permitir a un operador aprobado transferir créditos", async function () {
      const transferAmount = 400;
      await creditContract.connect(organization).setApprovalForAll(owner.address, true);
      
      await creditContract.connect(owner).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x");
      
      const orgBalance = totalAmount - transferAmount;
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(orgBalance);
      expect(await creditContract.balanceOf(company.address, FIRST_CREDIT_ID)).to.equal(transferAmount);
    });

    it("Debería fallar si se intenta transferir más créditos de los que se poseen", async function () {
      const transferAmount = totalAmount + 1;
      await expect(
        creditContract.connect(organization).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWithCustomError(creditContract, "ERC1155InsufficientBalance");
    });

    it("Debería devolver cero para el balance de la dirección cero", async function () {      
      const balance = await creditContract.balanceOf(ethers.ZeroAddress, FIRST_CREDIT_ID);
      expect(balance).to.equal(0);
    });

    it("Debería impedir que una cuenta no autorizada transfiera créditos", async function () {      
      const transferAmount = 100;
      await expect(
        creditContract.connect(company).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWithCustomError(creditContract, "ERC1155MissingApprovalForAll");
    });

    it("Debería impedir la transferencia a la dirección cero", async function () {      
      const transferAmount = 100;
      await expect(
        creditContract.connect(organization).safeTransferFrom(organization.address, ethers.ZeroAddress, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWithCustomError(creditContract, "ERC1155InvalidReceiver");
    });

    it("Debería permitir quemar tokens", async function() {        
      const burnAmount = 200;
      await creditContract.connect(organization).burn(organization.address, FIRST_CREDIT_ID, burnAmount);
      
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(totalAmount - burnAmount);
    });

    it("Debería impedir quemar más tokens de los que se poseen", async function() {
      const burnAmount = totalAmount + 1;        
      await expect(
        creditContract.connect(organization).burn(organization.address, FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWithCustomError(creditContract, "ERC1155InsufficientBalance");
    });

    it("Debería impedir que una cuenta queme tokens de otra cuenta", async function() {      
      const burnAmount = 100;
      await expect(
        creditContract.connect(company).burn(organization.address, FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWithCustomError(creditContract, "ERC1155MissingApprovalForAll");
    });
  });

});
