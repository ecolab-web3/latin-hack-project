import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { CarbonCredits_LatinHack } from "../typechain-types";

// Describe el conjunto de pruebas para el contrato CarbonCredits_LatinHack refactorizado
describe("CarbonCredits_LatinHack (Autosuficiente)", function () {
  
  let creditContract: CarbonCredits_LatinHack;
  let admin: HardhatEthersSigner;
  let certifier: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;
  let organization: HardhatEthersSigner;
  let company: HardhatEthersSigner;

  const proofHash = "0x123456789012345678901234567890123456789012345678901234567890abcd";
  const FIRST_CREDIT_ID = 0;

  beforeEach(async function () {
    [admin, certifier, verifier, organization, company] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CarbonCredits_LatinHack");
    // O 'owner' agora é chamado de 'admin' para consistência
    creditContract = await Factory.deploy(admin.address); 
    await creditContract.waitForDeployment();
  });

  describe("Despliegue y Gestión de Roles", function () {
    it("Debería establecer el admin correcto", async function () {
      // Verificamos la variable de estado 'admin'
      expect(await creditContract.admin()).to.equal(admin.address);
    });

    it("Debería otorgar los roles de certificador y verificador al admin inicial", async function () {
      // Verificamos los mapeos 'isCertifier' y 'isVerifier'
      expect(await creditContract.isCertifier(admin.address)).to.be.true;
      expect(await creditContract.isVerifier(admin.address)).to.be.true;
    });

    it("Debería permitir al admin otorgar y revocar el rol de certificador", async function () {
      await creditContract.connect(admin).grantCertifierRole(certifier.address);
      expect(await creditContract.isCertifier(certifier.address)).to.be.true;
      
      await creditContract.connect(admin).revokeCertifierRole(certifier.address);
      expect(await creditContract.isCertifier(certifier.address)).to.be.false;
    });

    it("Debería permitir al admin otorgar y revocar el rol de verificador", async function () {
      await creditContract.connect(admin).grantVerifierRole(verifier.address);
      expect(await creditContract.isVerifier(verifier.address)).to.be.true;
      
      await creditContract.connect(admin).revokeVerifierRole(verifier.address);
      expect(await creditContract.isVerifier(verifier.address)).to.be.false;
    });

    it("Debería impedir que no-admins gestionen roles", async function () {      
      await expect(
        creditContract.connect(certifier).grantCertifierRole(company.address)
      ).to.be.revertedWith("Llamador no es el admin");
    });

    it("Debería impedir que no-admins revoquen el rol de certificador", async function () {
      await creditContract.connect(admin).grantCertifierRole(certifier.address);
      await expect(
        creditContract.connect(company).revokeCertifierRole(certifier.address)
      ).to.be.revertedWith("Llamador no es el admin");
    });

    it("Debería impedir que no-admins otorguen el rol de verificador", async function () {
      await expect(
        creditContract.connect(certifier).grantVerifierRole(verifier.address)
      ).to.be.revertedWith("Llamador no es el admin");
    });

    it("Debería impedir que no-admins revoquen el rol de verificador", async function () {
      await creditContract.connect(admin).grantVerifierRole(verifier.address);
      await expect(
        creditContract.connect(certifier).revokeVerifierRole(verifier.address)
      ).to.be.revertedWith("Llamador no es el admin");
    });
  });

  describe("certifyAndMintCarbonCredit (Acuñación)", function () {
    beforeEach(async function () {
      await creditContract.connect(admin).grantCertifierRole(certifier.address);
    });

    it("Debería crear un nuevo tipo de token y acuñar la cantidad correcta", async function () {
      const co2eAmount = 1000;
      await expect(
        creditContract.connect(certifier).certifyAndMintCarbonCredit(organization.address, "VCS", co2eAmount, "Amazon Rainforest", proofHash)
      ).to.emit(creditContract, "CreditCertified");
      
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(co2eAmount);
    });

    it("Debería impedir que un no-certificador acuñe créditos", async function () {      
      await expect(
        creditContract.connect(company).certifyAndMintCarbonCredit(organization.address, "VCS", 1000, "Amazon Rainforest", proofHash)
      ).to.be.revertedWith("Llamador no es un certificador");
    });
    
    it("Debería fallar si se intenta acuñar créditos para la dirección cero", async function () {            
      await expect(
        creditContract.connect(certifier).certifyAndMintCarbonCredit(ethers.ZeroAddress, "VCS", 1000, "Amazon Rainforest", proofHash)
      ).to.be.revertedWith("ERC1155: no se puede acunar a la direccion cero");
    });
  });

  describe("retireCredit (Quema)", function () {
    const totalAmount = 1000;
    beforeEach(async function () {
      await creditContract.connect(admin).certifyAndMintCarbonCredit(organization.address, "VCS", totalAmount, "Amazon Rainforest", proofHash);
    });

    it("Debería permitir al dueño quemar una porción de sus créditos", async function () {
      const burnAmount = 300;
      await creditContract.connect(organization).retireCredit(FIRST_CREDIT_ID, burnAmount);
      const remainingBalance = totalAmount - burnAmount;
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(remainingBalance);
    });
    
    it("Debería fallar si se intenta quemar más créditos de los que se poseen", async function () {      
      const burnAmount = totalAmount + 1;      
      await expect(
        creditContract.connect(organization).retireCredit(FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWith("ERC1155: balance insuficiente para quemar");
    });
  });

  describe("Funcionalidad ERC-1155", function () {
    const totalAmount = 1000;
    beforeEach(async function () {
      await creditContract.connect(admin).certifyAndMintCarbonCredit(organization.address, "VCS", totalAmount, "Amazon Rainforest", proofHash);
    });

    it("Debería permitir la transferencia de una porción de créditos", async function () {
      const transferAmount = 300;
      await creditContract.connect(organization).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x");
      const orgBalance = totalAmount - transferAmount;
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(orgBalance);
    });

    it("Debería impedir que una cuenta no autorizada transfiera créditos", async function () {            
      await expect(
        creditContract.connect(company).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, 100, "0x")
      ).to.be.revertedWith("ERC1155: no autorizado para transferir");
    });

    it("Debería impedir la transferencia a la dirección cero", async function () {            
      await expect(
        creditContract.connect(organization).safeTransferFrom(organization.address, ethers.ZeroAddress, FIRST_CREDIT_ID, 100, "0x")
      ).to.be.revertedWith("ERC1155: no se puede transferir a la direccion cero");
    });

    it("Debería impedir que una cuenta no autorizada queme tokens de otra cuenta", async function() {      
      const burnAmount = 100;
      // 'company' (no autorizada) intenta quemar los tokens de 'organization'
      await expect(
        creditContract.connect(company).burn(organization.address, FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWith("ERC1155: no autorizado para quemar");
    });

    it("Debería permitir a un dueño de tokens aprobar un operador para su cuenta", async function () {
      // 'organization' aprueba a 'company' como operador
      await expect(creditContract.connect(organization).setApprovalForAll(company.address, true))
        .to.emit(creditContract, "ApprovalForAll")
        .withArgs(organization.address, company.address, true);

      expect(await creditContract.isApprovedForAll(organization.address, company.address)).to.be.true;
    });

    it("Debería permitir a un operador aprobado transferir créditos en nombre del dueño", async function () {
      const transferAmount = 400;
      // 'organization' aprueba a 'company'
      await creditContract.connect(organization).setApprovalForAll(company.address, true);
      
      // 'company' (el operador) transfiere los créditos de 'organization' para sí misma
      await creditContract.connect(company).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x");
      
      const orgBalance = totalAmount - transferAmount;
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(orgBalance);
      expect(await creditContract.balanceOf(company.address, FIRST_CREDIT_ID)).to.equal(transferAmount);
    });

    it("Debería permitir a un operador aprobado quemar créditos en nombre del dueño", async function () {
      const burnAmount = 250;
      // 'organization' aprueba a 'company'
      await creditContract.connect(organization).setApprovalForAll(company.address, true);

      // 'company' (el operador) quema los créditos de 'organization'
      await creditContract.connect(company).burn(organization.address, FIRST_CREDIT_ID, burnAmount);

      const expectedBalance = totalAmount - burnAmount;
      expect(await creditContract.balanceOf(organization.address, FIRST_CREDIT_ID)).to.equal(expectedBalance);
    });

    it("Debería impedir la transferencia de una cantidad mayor al balance", async function () {
      const transferAmount = totalAmount + 1;
      await expect(
        creditContract.connect(organization).safeTransferFrom(organization.address, company.address, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWith("ERC1155: balance insuficiente");
    });
  });
});