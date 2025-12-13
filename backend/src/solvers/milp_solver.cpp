#include "milp_solver.hpp"
#include <ortools/linear_solver/linear_solver.h>
#include <map>
#include <cmath>
#include <iostream>

namespace dealr {

std::vector<Settlement> solveMILP(
    const std::vector<PlayerBalance>& balances,
    std::optional<int> maxTransfersPerPlayer,
    std::optional<double> minTransferAmount
) {
    using namespace operations_research;

    // Separate debtors and creditors
    std::vector<int> debtorIdx, creditorIdx;
    for (size_t i = 0; i < balances.size(); ++i) {
        if (balances[i].netBalance < -0.01) {
            debtorIdx.push_back(i);
        } else if (balances[i].netBalance > 0.01) {
            creditorIdx.push_back(i);
        }
    }

    // Handle edge cases
    if (debtorIdx.empty() || creditorIdx.empty()) {
        return {};
    }

    // Create solver
    std::unique_ptr<MPSolver> solver(MPSolver::CreateSolver("CBC"));
    if (!solver) {
        std::cerr << "Failed to create CBC solver" << std::endl;
        return {};
    }

    // Variables: x[d][c] = amount debtor d pays creditor c
    // Variables: y[d][c] = binary indicator
    std::map<std::pair<int, int>, MPVariable*> x, y;

    // Big-M = sum of all debts
    double M = 0;
    for (int d : debtorIdx) {
        M += std::abs(balances[d].netBalance);
    }

    // Create variables
    for (int d : debtorIdx) {
        for (int c : creditorIdx) {
            x[{d, c}] = solver->MakeNumVar(
                0, M,
                "x_" + std::to_string(d) + "_" + std::to_string(c)
            );
            y[{d, c}] = solver->MakeBoolVar(
                "y_" + std::to_string(d) + "_" + std::to_string(c)
            );
        }
    }

    // Constraints: each debtor pays exactly their debt
    for (int d : debtorIdx) {
        double debt = std::abs(balances[d].netBalance);
        MPConstraint* ct = solver->MakeRowConstraint(debt, debt);
        for (int c : creditorIdx) {
            ct->SetCoefficient(x[{d, c}], 1);
        }
    }

    // Constraints: each creditor receives exactly their credit
    for (int c : creditorIdx) {
        double credit = balances[c].netBalance;
        MPConstraint* ct = solver->MakeRowConstraint(credit, credit);
        for (int d : debtorIdx) {
            ct->SetCoefficient(x[{d, c}], 1);
        }
    }

    // Linking constraints: x[d][c] <= M * y[d][c]
    for (int d : debtorIdx) {
        for (int c : creditorIdx) {
            MPConstraint* ct = solver->MakeRowConstraint(
                -solver->infinity(), 0
            );
            ct->SetCoefficient(x[{d, c}], 1);
            ct->SetCoefficient(y[{d, c}], -M);
        }
    }

    // Optional: min transfer amount constraint
    if (minTransferAmount.has_value() && *minTransferAmount > 0.01) {
        for (int d : debtorIdx) {
            for (int c : creditorIdx) {
                MPConstraint* ct = solver->MakeRowConstraint(
                    0, solver->infinity()
                );
                ct->SetCoefficient(x[{d, c}], 1);
                ct->SetCoefficient(y[{d, c}], -*minTransferAmount);
            }
        }
    }

    // Optional: max transfers per player
    if (maxTransfersPerPlayer.has_value() && *maxTransfersPerPlayer > 0) {
        // Max transfers from each debtor
        for (int d : debtorIdx) {
            MPConstraint* ct = solver->MakeRowConstraint(0, *maxTransfersPerPlayer);
            for (int c : creditorIdx) {
                ct->SetCoefficient(y[{d, c}], 1);
            }
        }
        // Max transfers to each creditor
        for (int c : creditorIdx) {
            MPConstraint* ct = solver->MakeRowConstraint(0, *maxTransfersPerPlayer);
            for (int d : debtorIdx) {
                ct->SetCoefficient(y[{d, c}], 1);
            }
        }
    }

    // Objective: minimize number of transfers
    MPObjective* objective = solver->MutableObjective();
    for (int d : debtorIdx) {
        for (int c : creditorIdx) {
            objective->SetCoefficient(y[{d, c}], 1);
        }
    }
    objective->SetMinimization();

    // Solve
    const MPSolver::ResultStatus result_status = solver->Solve();

    if (result_status != MPSolver::OPTIMAL &&
        result_status != MPSolver::FEASIBLE) {
        std::cerr << "No solution found. Status: " << result_status << std::endl;
        return {};
    }

    // Extract results
    std::vector<Settlement> settlements;
    for (int d : debtorIdx) {
        for (int c : creditorIdx) {
            double amount = x[{d, c}]->solution_value();
            if (amount > 0.01) {
                settlements.push_back({
                    balances[d].playerName,
                    balances[c].playerName,
                    std::round(amount * 100) / 100.0
                });
            }
        }
    }

    return settlements;
}

}
