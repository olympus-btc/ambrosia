package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.ContentConvertException
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.ContentTransformationException
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.CreateFreelanceInvoiceRequest
import pos.ambrosia.models.PayFreelanceInvoiceRequest
import pos.ambrosia.services.FreelanceInvoiceService
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.authorizePermission

fun Application.configureFreelanceInvoices() {
    val freelanceInvoiceService = FreelanceInvoiceService(environment)
    routing { route("/freelance/invoices") { freelanceInvoices(freelanceInvoiceService) } }
}

fun Route.freelanceInvoices(freelanceInvoiceService: FreelanceInvoiceService) {
    authorizePermission("invoices_read") {
        get("") {
            call.respond(HttpStatusCode.OK, freelanceInvoiceService.getFreelanceInvoices())
        }

        get("/{id}") {
            val freelanceInvoiceId = call.parameters["id"] ?: throw InvalidTimeEntryException("Missing freelance invoice ID")
            val freelanceInvoice =
                freelanceInvoiceService.getFreelanceInvoiceById(freelanceInvoiceId)
                    ?: throw ResourceNotFoundException("Freelance invoice not found")
            call.respond(HttpStatusCode.OK, freelanceInvoice)
        }
    }

    authorizePermission("invoices_create") {
        post("/preview") {
            val createFreelanceInvoiceRequest = call.receiveCreateFreelanceInvoiceRequest()
            call.respond(HttpStatusCode.OK, freelanceInvoiceService.previewDraftInvoice(createFreelanceInvoiceRequest))
        }

        post("") {
            val createFreelanceInvoiceRequest = call.receiveCreateFreelanceInvoiceRequest()
            call.respond(HttpStatusCode.Created, freelanceInvoiceService.createDraftInvoice(createFreelanceInvoiceRequest))
        }
    }

    authorizePermission("invoices_pay") {
        post("/{id}/pay") {
            val freelanceInvoiceId = call.parameters["id"] ?: throw InvalidTimeEntryException("Missing freelance invoice ID")
            val payFreelanceInvoiceRequest = call.receivePayFreelanceInvoiceRequest()
            call.respond(HttpStatusCode.OK, freelanceInvoiceService.payFreelanceInvoice(freelanceInvoiceId, payFreelanceInvoiceRequest))
        }
    }
}

private suspend fun ApplicationCall.receiveCreateFreelanceInvoiceRequest(): CreateFreelanceInvoiceRequest =
    try {
        receive<CreateFreelanceInvoiceRequest>()
    } catch (_: BadRequestException) {
        throw InvalidTimeEntryException("Invalid freelance invoice request body")
    } catch (_: ContentTransformationException) {
        throw InvalidTimeEntryException("Invalid freelance invoice request body")
    } catch (_: ContentConvertException) {
        throw InvalidTimeEntryException("Invalid freelance invoice request body")
    }

private suspend fun ApplicationCall.receivePayFreelanceInvoiceRequest(): PayFreelanceInvoiceRequest =
    try {
        receive<PayFreelanceInvoiceRequest>()
    } catch (_: BadRequestException) {
        throw InvalidTimeEntryException("Invalid freelance invoice payment request body")
    } catch (_: ContentTransformationException) {
        throw InvalidTimeEntryException("Invalid freelance invoice payment request body")
    } catch (_: ContentConvertException) {
        throw InvalidTimeEntryException("Invalid freelance invoice payment request body")
    }
