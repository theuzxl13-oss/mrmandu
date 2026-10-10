"use server";

import * as appointments from "@/server/services/appointment.service";
import { getAvailability } from "@/server/services/availability.service";
import { withActor } from "./run-action";

const ALL_PANELS = ["/cliente", "/barbeiro", "/admin"];

export async function getAvailabilityAction(input: unknown) {
  return withActor(["CLIENT", "ADMIN", "BARBER"], (actor) => getAvailability(actor, input));
}

export async function createAppointmentAction(input: unknown) {
  return withActor(["CLIENT", "ADMIN", "BARBER"], (actor) => appointments.createAppointment(actor, input), {
    revalidate: ALL_PANELS,
    message: "Agendamento realizado com sucesso!",
  });
}

export async function cancelAppointmentAction(input: unknown) {
  return withActor(["CLIENT", "BARBER", "ADMIN"], (actor) => appointments.cancelAppointment(actor, input), {
    revalidate: ALL_PANELS,
    message: "Agendamento cancelado.",
  });
}

export async function confirmAppointmentAction(id: unknown) {
  return withActor(["BARBER", "ADMIN"], (actor) => appointments.confirmAppointment(actor, id), {
    revalidate: ALL_PANELS,
    message: "Agendamento confirmado.",
  });
}

export async function completeAppointmentAction(id: unknown) {
  return withActor(["BARBER", "ADMIN"], (actor) => appointments.completeAppointment(actor, id), {
    revalidate: ALL_PANELS,
    message: "Atendimento concluído.",
  });
}

export async function rescheduleAppointmentAction(input: unknown) {
  return withActor(["CLIENT", "BARBER", "ADMIN"], (actor) => appointments.rescheduleAppointment(actor, input), {
    revalidate: ALL_PANELS,
    message: "Agendamento reagendado.",
  });
}

export async function getRescheduleSlotsAction(input: unknown) {
  return withActor(["CLIENT", "BARBER", "ADMIN"], (actor) => appointments.getRescheduleSlots(actor, input));
}

export async function updateNotesAction(input: unknown) {
  return withActor(["BARBER", "ADMIN"], (actor) => appointments.updateAppointmentNotes(actor, input), {
    revalidate: ALL_PANELS,
    message: "Observações salvas.",
  });
}
