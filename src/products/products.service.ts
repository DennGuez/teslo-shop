import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { Product } from './entities/product.entity'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { PaginationDto } from './../common/dtos/pagination.dto'
import { validate as isUUID } from 'uuid'


@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService')

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

  ){}


  async create(createProductDto: CreateProductDto) {
    try {

      /* Creamos la instancia del producto */
      const product  = this.productRepository.create(createProductDto)
      /* Guardamos producto contra la DB */
      await this.productRepository.save(product)
      return product

    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll( paginationDto: PaginationDto ) {
    // como son opcionales, les ponemos un valor por defecto
    const { limit = 10, offset = 0 } = paginationDto
    return this.productRepository.find({
        take: limit,
        skip: offset
        //TODO relaciones
    })
  }

  async findOne(term: string) {
    // const product = await this.productRepository.findOneBy({ term })

    let product: Product

    // if ( isUUID(term) ) {
    //   product = await this.productRepository.findOneBy({id: term})
    // } else {
    //   product = await this.productRepository.findOneBy({slug: term})
    // }

    /* Con QueryBuilder */
     if ( isUUID(term) ) {
      product = await this.productRepository.findOneBy({id: term})
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder()
      // select * from Products where slug='XX' or title="XXXX"
      product = await queryBuilder.where('UPPER(title) = :title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLocaleLowerCase()
      }).getOne()
    }

    if( !product ) 
      throw new NotFoundException(`Product with ${ term } not found`)
    return product
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const product = await this.productRepository.preload({
      // id: id,
      id,
      ...updateProductDto
    })

    if ( !product ) throw new NotFoundException(`Product with id: ${ id } not found`)

    try {
      // return this.productRepository.save( product)
      await this.productRepository.save(product)
      return product
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id)
    await this.productRepository.remove(product)
  }

  private handleDBExceptions( error: any ) {
    if ( error.code === '23505')
    throw new BadRequestException(error.detail)

    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
