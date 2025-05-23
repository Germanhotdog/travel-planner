import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Activity {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  activities: string | null;
  ownerId: string;
  planId: string;
}

export interface Plan {
  id: string;
  title: string;
  ownerId: string;
  activities: Activity[];
}

interface PlanState {
  plans: Plan[];
}

const initialState: PlanState = {
  plans: [],
};

const planSlice = createSlice({
  name: 'plans',
  initialState,
  reducers: {
    setPlans: (state, action: PayloadAction<Plan[]>) => {
      state.plans = action.payload;
    },
  },
});

export const { setPlans } = planSlice.actions;
export default planSlice.reducer;