"use client";

import {
  TopPerformingAgent,
} from "@repo/shared";


interface TopPerformingAgentsProps {
  agents:
    TopPerformingAgent[];

  periodLabel:
    string;
}


// =====================================================
// PESO FORMATTER
// =====================================================

const formatMoney = (
  value: number
) => {

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        0,
    }
  ).format(value);
};


// =====================================================
// STATUS STYLE
// =====================================================

const getStatusStyle = (
  status: string
) => {

  switch (status) {

    case "ACTIVE":
      return `
        bg-positive
        text-neutralLight
      `;


    case "EXPIRED":
      return `
        bg-negative
        text-neutralLight
      `;


    case "SUSPENDED":
      return `
        bg-secondary
        text-neutralLight
      `;


    case "DROPPED":
      return `
        bg-mainPrimary
        text-neutralLight
      `;


    case "REMOVE":
      return `
        bg-darkPrimary
        text-neutralLight
      `;


    default:
      return `
        bg-neutralLight
        text-neutralPrimary
      `;
  }
};


// =====================================================
// COMPONENT
// =====================================================

export default function TopPerformingAgents({
  agents,
  periodLabel,
}: TopPerformingAgentsProps) {

  return (

    <section
      className="
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-neutralMed
        bg-white
        shadow-sm
      "
    >

      {/* =============================================== */}
      {/* HEADER */}
      {/* =============================================== */}

      <div
        className="
          flex
          items-center
          justify-between
          px-custom-24
          py-custom-24
        "
      >

        <div>

          <h2
            className="
              text-base
              font-bold
              text-mainPrimary
            "
          >
            Top 10 Performing Agents
          </h2>


          <p
            className="
              mt-1
              text-xs
              text-neutralPrimary
            "
          >
            Ranked by loans processed during{" "}
            {periodLabel}.
          </p>

        </div>

      </div>


      {/* =============================================== */}
      {/* TABLE */}
      {/* =============================================== */}

      <div
        className="
          w-full
          overflow-x-auto
          px-custom-24
          pb-custom-24
        "
      >

        <table
          className="
            w-full
            min-w-225
            border-collapse
          "
        >

          {/* =========================================== */}
          {/* HEADER */}
          {/* =========================================== */}

          <thead>

            <tr
              className="
                bg-neutralLight
                text-mainPrimary
              "
            >

              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Rank
              </th>


              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Agent ID
              </th>


              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Agent Name
              </th>


              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Level
              </th>


              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Status
              </th>


              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Loans
              </th>


              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Total Commission
              </th>


              <th
                className="
                  px-custom-16
                  py-custom-16
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                "
              >
                Streak
              </th>

            </tr>

          </thead>


          {/* =========================================== */}
          {/* BODY */}
          {/* =========================================== */}

          <tbody>

            {agents.length === 0 && (

              <tr>

                <td
                  colSpan={8}
                  className="
                    py-custom-32
                    text-center
                    text-sm
                    text-neutralPrimary
                  "
                >
                  No agent performance data found for the selected period.
                </td>

              </tr>

            )}


            {agents.map(
              (
                agent
              ) => (

                <tr
                  key={
                    agent.agentId
                  }
                  className="
                    border-b
                    border-neutralMed
                    transition
                    duration-150

                    last:border-b-0

                    hover:bg-neutralLight
                  "
                >

                  {/* RANK */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                      text-sm
                      font-bold
                      text-mainPrimary
                    "
                  >
                    #{agent.rank}
                  </td>


                  {/* CODE */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                      text-sm
                      text-mainPrimary
                    "
                  >
                    {agent.agentCode}
                  </td>


                  {/* NAME */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                      text-sm
                      font-bold
                      text-mainPrimary
                    "
                  >
                    {agent.agentName}
                  </td>


                  {/* LEVEL */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                      text-sm
                      text-mainPrimary
                    "
                  >
                    {agent.level}
                  </td>


                  {/* STATUS */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                    "
                  >

                    <span
                      className={`
                        inline-flex
                        rounded-full
                        px-custom-16
                        py-1
                        text-xs
                        font-semibold

                        ${getStatusStyle(
                          agent.status
                        )}
                      `}
                    >
                      {agent.status}
                    </span>

                  </td>


                  {/* LOANS */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                      text-sm
                      font-medium
                      text-mainPrimary
                    "
                  >
                    {agent.loans.toLocaleString(
                      "en-PH"
                    )}
                  </td>


                  {/* COMMISSION */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                      text-sm
                      font-bold
                      text-mainPrimary
                    "
                  >
                    {formatMoney(
                      agent.totalCommission
                    )}
                  </td>


                  {/* STREAK */}

                  <td
                    className="
                      px-custom-16
                      py-custom-16
                      text-sm
                      text-mainPrimary
                    "
                  >
                    {agent.streak}{" "}
                    {agent.streak === 1
                      ? "month"
                      : "months"
                    }
                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}