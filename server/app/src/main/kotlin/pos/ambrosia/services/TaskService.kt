package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.TaskEntity
import pos.ambrosia.db.tables.TasksTable
import pos.ambrosia.logger
import pos.ambrosia.models.FreelanceTask
import pos.ambrosia.models.FreelanceTaskUpsert
import java.time.LocalDateTime
import java.util.UUID

class TaskService {
    private fun parseUuid(value: String): UUID? =
        try {
            UUID.fromString(value)
        } catch (_: IllegalArgumentException) {
            null
        }

    private fun isValidTaskRequest(taskRequest: FreelanceTaskUpsert): Boolean = taskRequest.name.isNotBlank()

    private fun toTaskModel(taskEntity: TaskEntity): FreelanceTask =
        FreelanceTask(
            id = taskEntity.id.value.toString(),
            name = taskEntity.name,
            isBillable = taskEntity.isBillable,
            isDeleted = taskEntity.isDeleted,
            createdAt = taskEntity.createdAt,
        )

    fun getTasks(): List<FreelanceTask> =
        transaction {
            TaskEntity
                .find { TasksTable.isDeleted eq false }
                .map { taskEntity -> toTaskModel(taskEntity) }
        }

    fun getTaskById(taskId: String): FreelanceTask? =
        transaction {
            val taskUuid = parseUuid(taskId) ?: return@transaction null
            val taskEntity = TaskEntity.findById(taskUuid) ?: return@transaction null
            if (taskEntity.isDeleted) return@transaction null
            toTaskModel(taskEntity)
        }

    fun addTask(taskRequest: FreelanceTaskUpsert): String? =
        transaction {
            if (!isValidTaskRequest(taskRequest)) return@transaction null

            val taskId =
                TaskEntity
                    .new(UUID.randomUUID()) {
                        name = taskRequest.name
                        isBillable = taskRequest.isBillable
                        isDeleted = false
                        createdAt = LocalDateTime.now().toString()
                    }.id.value
                    .toString()
            logger.info("Freelance task created: $taskId")
            taskId
        }

    fun updateTask(
        taskId: String,
        taskRequest: FreelanceTaskUpsert,
    ): Boolean =
        transaction {
            val taskUuid = parseUuid(taskId) ?: return@transaction false
            if (!isValidTaskRequest(taskRequest)) return@transaction false

            val taskEntity = TaskEntity.findById(taskUuid) ?: return@transaction false
            if (taskEntity.isDeleted) return@transaction false

            taskEntity.name = taskRequest.name
            taskEntity.isBillable = taskRequest.isBillable
            logger.info("Freelance task updated: $taskId")
            true
        }

    fun deleteTask(taskId: String): Boolean =
        transaction {
            val taskUuid = parseUuid(taskId) ?: return@transaction false
            val taskEntity = TaskEntity.findById(taskUuid) ?: return@transaction false
            if (taskEntity.isDeleted) return@transaction false

            taskEntity.isDeleted = true
            logger.info("Freelance task soft deleted: $taskId")
            true
        }
}
