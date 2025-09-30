import { myTokenModuleMyTokenConfig } from "../generated";
import { useReadContracts } from "wagmi";
import { Mint } from "./Mint";
import { Burn } from "./Burn";
import type { Abi } from "viem";

export function ContractData(params: {
  contractAddress: `0x${string}`;
  userAddresses?: readonly `0x${string}`[];
}) {
  const userAddressesSet = new Set(params.userAddresses);

  const myTokenContract = {
    address: params.contractAddress,
    abi: myTokenModuleMyTokenConfig.abi as Abi,
  } as const;

  const contractData = useReadContracts({
    contracts: [
      {
        ...myTokenContract,
        functionName: "owner",
      },
      {
        ...myTokenContract,
        functionName: "totalSupply",
      },
      {
        ...myTokenContract,
        functionName: "symbol",
      },
      {
        ...myTokenContract,
        functionName: "decimals",
      },
      ...(params.userAddresses ?? []).map((addr) => ({
        ...myTokenContract,
        functionName: "balanceOf",
        args: [addr],
      })),
    ],
  });

  let error: string | null = null;

  if (contractData.error !== null) {
    error = contractData.error.toString();
  } else {
    error =
      contractData.data?.find((el) => el.error !== undefined)?.toString() ||
      null;
  }

  if (error !== null) {
    return (
      <p>
        Loading contract data for{" "}
        <span className="font-bold">{params.contractAddress}</span> failed!
        <br />
        <code style={{ whiteSpace: "pre-wrap" }}>{error}</code>
      </p>
    );
  }

  if (
    contractData.isLoading ||
    contractData?.data === undefined ||
    contractData.data.some((el) => el === undefined)
  ) {
    return (
      <p>
        Loading contract data for{" "}
        <span className="font-bold">{params.contractAddress}</span>...
      </p>
    );
  }

  const owner = contractData.data[0].result as `0x${string}`;
  const isOwner = owner && userAddressesSet.has(owner);
  const totalSupply = contractData.data[1].result as bigint;
  const tokenName = contractData.data[2].result as string;
  const decimals = contractData.data[3].result as number;
  const balances = contractData.data.slice(4).map((el) => el.result as bigint);

  const formatMoney = (amount: bigint): string =>
    String(Number(amount / 10n ** (BigInt(decimals) - 3n)) / 1000) +
    " " +
    tokenName;

  return (
    <div data-testid="contract-data">
      <p>
        Smart contract address:{" "}
        <span className="font-bold">{params.contractAddress}</span>
      </p>
      <p>
        Total supply:{" "}
        <span className="font-bold">{formatMoney(totalSupply)}</span>
      </p>

      {params.userAddresses && params.userAddresses.length > 0 && (
        <div className="border rounded-md my-5 p-4 w-full align-top" style={{
          backgroundColor: "var(--bg-light)",
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-sm)"
        }}>
          <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-color)" }}>Balances</h3>
          <div className="balance-grid">
            {balances
              .map((val, index) => [
                <div key={index.toString() + "_addr"} className="balance-address">
                  <span className="balance-label">Address:</span>
                  <span className="balance-value">{params.userAddresses![index]}</span>
                </div>,
                <div key={index.toString() + "_value"} className="balance-amount">
                  <span className="balance-amount-value">{formatMoney(val)}</span>
                </div>,
              ])
              .flat()}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-6" style={{ marginTop: "20px", marginBottom: "16px" }}>
        <Mint
          contractAddress={params.contractAddress}
          ownerAddress={owner}
          isOwner={Boolean(isOwner)}
          decimals={decimals}
          symbol={tokenName}
        />

        {params.userAddresses && params.userAddresses.length > 0 && (
          <Burn
            contractAddress={params.contractAddress}
            decimals={decimals}
            symbol={tokenName}
            userBalance={balances[0] || 0n}
          />
        )}
      </div>

      <div style={{
        color: "var(--text-muted)",
        fontSize: "13px",
        marginTop: "16px",
        padding: "10px 14px",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderRadius: "8px",
        border: "1px solid rgba(34, 197, 94, 0.2)",
        fontWeight: "400",
        lineHeight: "1.5",
        textAlign: "center"
      }}>
        ✅ Anyone can mint this test token! No special permissions required.
      </div>
    </div>
  );
}
