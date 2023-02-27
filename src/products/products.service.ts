import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { validate as isUUID } from 'uuid'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { PaginationDto } from './../common/dtos/pagination.dto'
import { Product, ProductImage } from './entities'


@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService')

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly ProductImageRepository: Repository<ProductImage>,

  ){}


  async create(createProductDto: CreateProductDto) {
    try {

      const { images = [], ...productDetails } = createProductDto

      /* Creamos la instancia del producto */
      const product  = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.ProductImageRepository.create({ url: image }))
      })
      /* Guardamos producto contra la DB */
      await this.productRepository.save(product)
      // return product
      /* Las imagenes con nos llegan en array y no objectos */
      return { ...product, images: images}

    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll( paginationDto: PaginationDto ) {
    // como son opcionales, les ponemos un valor por defecto
    const { limit = 10, offset = 0 } = paginationDto
    const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations:{
          images: true
        }
    })
    // return products.map( product => ({
    //   ...product,
    //   images: product.images.map(img => img.url)
    // }))
    return products.map( ({images, ...rest}) => ({
      ...rest,
      images: images.map(img => img.url)
    }))
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
      const queryBuilder = this.productRepository.createQueryBuilder('prod')
      // select * from Products where slug='XX' or title="XXXX"
      product = await queryBuilder
      .where('UPPER(title) = :title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLocaleLowerCase()
      })
      .leftJoinAndSelect('prod.images', 'prodImages')
      .getOne()
    }

    if( !product ) 
      throw new NotFoundException(`Product with ${ term } not found`)
    return product
  }

  /* Esta funcion es un intermedio para regresar el objecto como queremos */
  /* Sustituimos esta funcion por la findOne() en el controler */
  async findOnePlain( term: string ) {
    const { images = [], ...rest } = await this.findOne( term )
    return {
      ...rest,
      images: images.map( image => image.url )
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const product = await this.productRepository.preload({
      // id: id,
      id,
      ...updateProductDto,
      images: []
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
